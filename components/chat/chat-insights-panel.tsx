"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getProductInsights } from "@/app/actions/insights-actions";

interface ChatInsightsPanelProps {
  productId: string;
  className?: string;
}

export function ChatInsightsPanel({ productId, className }: ChatInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("benefits");
  const [insightsData, setInsightsData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPersonas, setExpandedPersonas] = useState<Record<number, boolean>>({});

  // Toggle persona expansion
  const togglePersona = (index: number) => {
    setExpandedPersonas(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Fetch insights data if not already loaded
  const fetchInsights = async () => {
    if (insightsData || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await getProductInsights(productId);
      if (response.success) {
        setInsightsData(response.insights);
      } else {
        setError(response.error || "Failed to load insights");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Tabs configuration
  const tabs = [
    { id: "benefits", label: "Benefits" },
    { id: "complaints", label: "Complaints" },
    { id: "painPoints", label: "Pain Points" },
    { id: "valuedFeatures", label: "Valued Features" },
    { id: "emotionalTriggers", label: "Emotional Triggers" },
    { id: "customerPersonas", label: "Customer Personas" },
    { id: "headlines", label: "Headlines" },
    { id: "hooks", label: "Hooks" },
  ];

  // Helper function to render the content based on active tab
  const renderContent = () => {
    if (loading) {
      return <div className="p-4 text-center text-sm text-muted-foreground">Loading insights...</div>;
    }

    if (error) {
      return <div className="p-4 text-center text-sm text-red-500">{error}</div>;
    }

    if (!insightsData) {
      return (
        <div className="p-4 text-center text-sm text-muted-foreground">
          <Button variant="secondary" size="sm" onClick={fetchInsights}>
            Load Insights
          </Button>
        </div>
      );
    }

    switch (activeTab) {
      case "benefits":
        return (
          <div className="p-4 space-y-3">
            {insightsData.benefits.map((item: any, index: number) => (
              <div key={index} className="border rounded-md p-3 text-sm">
                <div className="font-medium">{item.benefit}</div>
                {item.examples && item.examples.length > 0 && (
                  <div className="mt-1.5 text-xs text-gray-600 italic">
                    "{item.examples[0]}"
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case "complaints":
        return (
          <div className="p-4 space-y-3">
            {insightsData.complaints.map((item: any, index: number) => (
              <div key={index} className="border rounded-md p-3 text-sm">
                <div className="font-medium">{item.complaint}</div>
                {item.examples && item.examples.length > 0 && (
                  <div className="mt-1.5 text-xs text-gray-600 italic">
                    "{item.examples[0]}"
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case "painPoints":
        return (
          <div className="p-4 space-y-3">
            {insightsData.painPoints.map((item: any, index: number) => (
              <div key={index} className="border rounded-md p-3 text-sm">
                <div className="font-medium">{item.painPoint}</div>
                {item.examples && item.examples.length > 0 && (
                  <div className="mt-1.5 text-xs text-gray-600 italic">
                    "{item.examples[0]}"
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case "valuedFeatures":
        return (
          <div className="p-4 space-y-3">
            {insightsData.valuedFeatures.map((item: any, index: number) => (
              <div key={index} className="border rounded-md p-3 text-sm">
                <div className="font-medium">{item.feature}</div>
                {item.examples && item.examples.length > 0 && (
                  <div className="mt-1.5 text-xs text-gray-600 italic">
                    "{item.examples[0]}"
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case "emotionalTriggers":
        return (
          <div className="p-4 space-y-3">
            {insightsData.emotionalTriggers.map((item: any, index: number) => (
              <div key={index} className="border rounded-md p-3 text-sm">
                <div className="font-medium">{item.trigger}</div>
                {item.examples && item.examples.length > 0 && (
                  <div className="mt-1.5 text-xs text-gray-600 italic">
                    "{item.examples[0]}"
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case "customerPersonas":
        return (
          <div className="p-4 space-y-3">
            {insightsData.customerPersonas.map((persona: any, index: number) => (
              <div key={index} className="border rounded-md overflow-hidden">
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => togglePersona(index)}
                >
                  <div>
                    <div className="bg-blue-50 text-blue-800 px-1.5 py-0.5 text-xs rounded inline-block">
                      {persona.awarenessLevel}
                    </div>
                    <div className="text-sm font-medium">{persona.name}</div>
                    {!expandedPersonas[index] && (
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {persona.keyFrustration}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100 rounded-full">
                    {expandedPersonas[index] ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {expandedPersonas[index] && (
                  <div className="p-3 pt-0 text-xs space-y-2 border-t bg-gray-50/50">
                    <div>
                      <div className="font-medium text-xs text-gray-500 mt-2">Demographic Sketch</div>
                      <div>{persona.demographicSketch}</div>
                    </div>
                    
                    <div>
                      <div className="font-medium text-xs text-gray-500">Emotional State</div>
                      <div>{persona.emotionalState}</div>
                    </div>
                    
                    <div>
                      <div className="font-medium text-xs text-gray-500">Internal Beliefs</div>
                      <div>{persona.internalBeliefs}</div>
                    </div>
                    
                    <div>
                      <div className="font-medium text-xs text-gray-500">Current Behaviors</div>
                      <div>{persona.currentBehaviors}</div>
                    </div>
                    
                    <div>
                      <div className="font-medium text-xs text-gray-500">Key Frustration</div>
                      <div>{persona.keyFrustration}</div>
                    </div>
                    
                    <div>
                      <div className="font-medium text-xs text-gray-500">Desired Transformation</div>
                      <div>{persona.desiredTransformation}</div>
                    </div>
                    
                    <div>
                      <div className="font-medium text-xs text-gray-500">Trigger Phrase</div>
                      <div className="italic">"{persona.triggerPhrase}"</div>
                    </div>
                    
                    <div>
                      <div className="font-medium text-xs text-gray-500">Hook That Would Work</div>
                      <div>{persona.hookThatWouldWork}</div>
                    </div>
                    
                    <div>
                      <div className="font-medium text-xs text-gray-500">Voice of Customer Quote</div>
                      <div className="italic bg-gray-100 p-2 rounded text-xs">"{persona.voiceOfCustomerQuote}"</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case "headlines":
        return (
          <div className="p-4 space-y-3">
            {insightsData.headlines.map((headline: string, index: number) => (
              <div key={index} className="border rounded-md p-3 text-sm">
                {headline}
              </div>
            ))}
          </div>
        );

      case "hooks":
        return (
          <div className="p-4 space-y-3">
            {insightsData.hooks.map((hook: string, index: number) => (
              <div key={index} className="border rounded-md p-3 text-sm">
                {hook}
              </div>
            ))}
          </div>
        );

      default:
        return <div className="p-4 text-center text-sm text-muted-foreground">Select a category</div>;
    }
  };

  return (
    <div className={cn("w-full lg:w-64 border-l bg-gray-50/50 flex flex-col", className)}>
      
      <ScrollArea className="whitespace-nowrap border-b">
        <div className="flex p-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              className="rounded-full text-xs px-3 mr-1 flex-shrink-0"
              onClick={() => {
                setActiveTab(tab.id);
                if (!insightsData) fetchInsights();
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
} 