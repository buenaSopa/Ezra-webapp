"use client";

import { useState } from "react";
import { Database, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatInsightsPanel } from "./chat-insights-panel";
import { ChatSuggestionsPanel } from "./chat-suggestions-panel";

interface ChatSidebarPanelProps {
  productId: string;
  onSuggestionClick: (suggestion: {
    content: string;
    hiddenPrompt: string;
  }) => void;
  className?: string;
}

export function ChatSidebarPanel({ 
  productId, 
  onSuggestionClick, 
  className 
}: ChatSidebarPanelProps) {
  return (
    <div className={`w-full lg:w-72 border-l bg-gray-50/50 flex flex-col ${className || ''}`}>
      <Tabs defaultValue="insights" className="flex flex-col h-full">
        <TabsList className="p-2 bg-transparent border-b rounded-none justify-center">
          <TabsTrigger 
            value="insights" 
            className="flex items-center gap-1.5 data-[state=active]:bg-white"
          >
            <Database className="h-3.5 w-3.5" />
            <span>AI Insights</span>
          </TabsTrigger>
          <TabsTrigger 
            value="prompts" 
            className="flex items-center gap-1.5 data-[state=active]:bg-white"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Prompts</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="insights" className="flex-1 p-0 m-0 overflow-hidden">
          <ChatInsightsPanel 
            productId={productId} 
            className="!w-full !border-l-0 h-full"
          />
        </TabsContent>
        
        <TabsContent value="prompts" className="flex-1 p-0 m-0 overflow-hidden">
          <ChatSuggestionsPanel 
            onSuggestionClick={onSuggestionClick} 
            className="!w-full !border-l-0 h-full"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 