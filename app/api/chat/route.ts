import { LlamaIndexAdapter, StreamData } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { OpenAI, MetadataMode } from "llamaindex";
import { createChatEngine } from "@/lib/chat-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Initialize StreamData for additional information
  const streamData = new StreamData();
  
  try {
    const { messages, productId } = await request.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required and must be an array" },
        { status: 400 }
      );
    }
    
    // Get the last user message
    const lastUserMessage = [...messages].reverse().find(
      (m) => m.role === "user"
    );
    
    if (!lastUserMessage) {
      return NextResponse.json(
        { error: "No user message found" },
        { status: 400 }
      );
    }
    
    // Initialize LLM with gpt-4o-mini
    const llm = new OpenAI({
      model: "gpt-4o-mini",
      temperature: 0.2,
    });
    
    // Create chat engine
    const chatEngine = await createChatEngine(llm, productId);
    
    // Format messages for LlamaIndex if needed
    const llamaMessages = messages.slice(0, -1).map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content
    }));
    
    // Get streaming response
    const stream = await chatEngine.chat({
      message: lastUserMessage.content,
      stream: true
    });
    
    // When the stream completes, we could add additional data if needed
    const onCompletion = () => {
      // Add metadata about the sources if needed
      streamData.close();
    };
    
    // Convert LlamaIndex stream to a format compatible with the AI SDK
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