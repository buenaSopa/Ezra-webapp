import { LlamaIndexAdapter, StreamData } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { OpenAI, MetadataMode, EngineResponse } from "llamaindex";
import { createChatEngine } from "@/lib/chat-engine";
import { saveChatMessage, updateChatSessionTimestamp } from "@/app/actions/chat-actions";
import { createClient } from "@/app/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Initialize StreamData for additional information
  const streamData = new StreamData();
  
  try {
    const { messages, productId, sessionId } = await request.json();
    
    console.log(`[Chat API] Received request for session ${sessionId}`, { 
      productId,
      messageCount: messages?.length
    });
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log("[Chat API] Error: Invalid messages");
      return NextResponse.json(
        { error: "Messages are required and must be an array" },
        { status: 400 }
      );
    }
    
    if (!sessionId) {
      console.log("[Chat API] Error: No session ID provided");
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }
    
    // Get the last user message
    const lastUserMessage = [...messages].reverse().find(
      (m) => m.role === "user"
    );
    
    if (!lastUserMessage) {
      console.log("[Chat API] Error: No user message found");
      return NextResponse.json(
        { error: "No user message found" },
        { status: 400 }
      );
    }
    
    console.log("[Chat API] Saving user message to database");
    
    // Save the user message to the database first
    await saveChatMessage({
      sessionId,
      role: "user",
      content: lastUserMessage.content
    });
    
    // Initialize LLM with gpt-4o-mini
    const llm = new OpenAI({
      model: "gpt-4o-mini",
      temperature: 0.2,
    });
    
    // Create chat engine
    console.log("[Chat API] Creating chat engine");
    const chatEngine = await createChatEngine(llm, productId);
    
    // Format messages for LlamaIndex if needed
    const llamaMessages = messages.slice(0, -1).map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content
    }));
    
    let completedContent = '';
    let sourceNodes: any[] = [];
    
    // Get streaming response
    console.log("[Chat API] Getting streaming response");
    const stream = await chatEngine.chat({
      message: lastUserMessage.content,
      stream: true
    });
    
    // When the stream completes, save the assistant message
    const onCompletion = async (content: string) => {
      try {
        console.log("[Chat API] Stream completed, saving assistant message");
        
        // Use the provided content parameter from the callback
        const finalContent = content;
        
        // Try to get the source nodes from the last call (non-streaming)
        try {
          const lastResponse = await chatEngine.chat({
            message: lastUserMessage.content,
            stream: false
          });
          
          if (lastResponse.sourceNodes && lastResponse.sourceNodes.length > 0) {
            sourceNodes = lastResponse.sourceNodes;
          }
        } catch (error) {
          console.error("[Chat API] Error getting source nodes:", error);
        }
        
        // Process source nodes if available
        let metadata = null;
        if (sourceNodes.length > 0) {
          console.log("[Chat API] Adding sources to metadata", { sourceCount: sourceNodes.length });
          metadata = { 
            sources: sourceNodes.map(node => ({
              text: node.node.getContent(MetadataMode.NONE),
              score: node.score,
              metadata: node.node.metadata
            }))
          };
          
          // Add sources to the stream data
          streamData.append({
            sources: metadata.sources
          });
        }
        
        // Save the complete assistant message
        await saveChatMessage({
          sessionId,
          role: "assistant",
          content: finalContent,
          metadata: metadata
        });
        
        // Update chat session's updatedAt timestamp
        await updateChatSessionTimestamp(sessionId);
        
        console.log("[Chat API] Closing stream data");
        streamData.close();
      } catch (error) {
        console.error("[Chat API] Error in onCompletion:", error);
      }
    };
    
    // Convert LlamaIndex stream to a format compatible with the AI SDK
    console.log("[Chat API] Returning stream response");
    return LlamaIndexAdapter.toDataStreamResponse(stream, {
      data: streamData,
      callbacks: {
        onCompletion
      }
    });
  } catch (error) {
    console.error("[Chat API Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 