"use client";

import { useState } from "react";
import { ChatContainer } from "@/components/chat/chat-container";
import { MessageProps } from "@/components/chat/message";

export default function ChatPage() {
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (message: string) => {
    // Add user message to chat
    const userMessage: MessageProps = {
      content: message,
      role: "user"
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    
    // Simulate a response (replace with actual API call)
    setTimeout(() => {
      const assistantMessage: MessageProps = {
        content: getResponseForMessage(message),
        role: "assistant"
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  // Helper function to generate responses based on prompts
  const getResponseForMessage = (message: string): string => {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes("script") || lowerMsg.includes("write")) {
      return "I'd be happy to help you write an ad script! To create an effective script, I'll need some information:\n\n1. What's the product or service you're advertising?\n2. Who is your target audience?\n3. What's the key message or benefit you want to highlight?\n4. How long should the script be (15s, 30s, 60s)?\n\nOnce you provide these details, I can craft a compelling script for your campaign.";
    }
    
    if (lowerMsg.includes("storyboard") || lowerMsg.includes("build")) {
      return "Creating a storyboard is a great way to visualize your ad before production. Let's break this down into steps:\n\n1. First, let's clarify the key scenes you want to include\n2. For each scene, we'll describe the visuals, text overlays, and any voiceover\n3. We'll include timing for each segment\n\nWhat's the core concept of your ad that you'd like to storyboard?";
    }
    
    if (lowerMsg.includes("variation") || lowerMsg.includes("generate")) {
      return "I can help generate ad variations to test different approaches. Some aspects we can vary include:\n\n• Headline approaches (question, statistic, direct benefit)\n• Tone (humorous, serious, inspirational)\n• Call-to-action phrasing\n• Value proposition emphasis\n\nWhich ad would you like me to create variations for?";
    }
    
    return `test response, user message: ${message}`;
  };

  return (
    <div className="h-full w-full">
      <ChatContainer
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        title="EzraGPT"
      />
    </div>
  );
} 