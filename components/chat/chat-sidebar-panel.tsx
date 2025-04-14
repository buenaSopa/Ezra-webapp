"use client";

import { useState } from "react";
import { Database, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatInsightsPanel } from "./chat-insights-panel";
import { ChatSuggestionsPanel } from "./chat-suggestions-panel";
import { getProductInsights, generateProductInsights } from "@/app/actions/insights-actions";
import { toast } from "sonner";

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
  // Add state to store insights data at the parent level
  const [insightsData, setInsightsData] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState<boolean>(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // Shared fetch function for insights data
  const fetchInsights = async () => {
    if (insightsData || insightsLoading) return;
    
    setInsightsLoading(true);
    setInsightsError(null);
    
    try {
      const response = await getProductInsights(productId);
      
      if (response.success) {
        setInsightsData(response.insights);
      } else {
        // If no insights found, generate them automatically
        if (response.error === "No insights found for this product" && !isGenerating) {
          await generateInsights();
        } else {
          setInsightsError(response.error || "Failed to load insights");
        }
      }
    } catch (err: any) {
      setInsightsError(err.message || "An error occurred");
    } finally {
      setInsightsLoading(false);
    }
  };

  // Function to generate new insights
  const generateInsights = async () => {
    if (!productId || isGenerating) return;
    
    setIsGenerating(true);
    setInsightsError(null);
    toast.info("Generating insights... This may take a minute.");
    
    try {
      const response = await generateProductInsights(productId, false);
      
      if (response.success) {
        setInsightsData(response.insights);
        toast.success("Insights generated successfully!");
      } else {
        setInsightsError(response.error || "Failed to generate insights");
        toast.error("Failed to generate insights");
      }
    } catch (err: any) {
      setInsightsError(err.message || "An error occurred");
      toast.error("Error generating insights");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`w-full lg:w-72 border-l bg-gray-50/50 flex flex-col ${className || ''}`}>
      <Tabs defaultValue="insights" className="flex flex-col h-full">
        <TabsList className="p-2 bg-transparent border-b rounded-none justify-center">
          <TabsTrigger 
            value="insights" 
            className="flex items-center gap-1.5 data-[state=active]:bg-white"
            onClick={() => {
              // Fetch insights data if not already loaded when clicking the tab
              if (!insightsData && !insightsLoading && !isGenerating) {
                fetchInsights();
              }
            }}
          >
            <Database className="h-3.5 w-3.5" />
            <span>Insights</span>
          </TabsTrigger>
          <TabsTrigger 
            value="prompts" 
            className="flex items-center gap-1.5 data-[state=active]:bg-white"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Prompts</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="insights" className="flex-1 p-0 m-0 overflow-hidden">
          <ChatInsightsPanel 
            productId={productId}
            insightsData={insightsData}
            isLoading={insightsLoading || isGenerating}
            error={insightsError}
            onFetchInsights={fetchInsights}
            onGenerateInsights={generateInsights}
            className="!w-full !border-l-0 h-full !p-0"
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