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
    
    // Get streaming response
    console.log("[Chat API] Getting streaming response");
    const stream = await chatEngine.chat({
      message: lastUserMessage.content,
      stream: true
    });
    
    // When the stream completes, just log the content
    const onCompletion = async (content: string) => {
      try {
        console.log("[Chat API] Stream completed");
        console.log("[Chat API] Full assistant response content:", content);

        await saveChatMessage({
          sessionId,
          role: "assistant",
          content
        });
        
      } catch (error) {
        console.error("[Chat API] Error in onCompletion:", error);
      } finally {
        streamData.close();
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