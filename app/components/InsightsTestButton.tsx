"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { generateProductInsights, getProductInsights } from "@/app/actions/insights-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InsightsTestButton({ productId }: { productId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeTaken, setTimeTaken] = useState<number | null>(null);
  const [activeSubTab, setActiveSubTab] = useState({
    'customer-needs': 'benefits',
    'competitive-edge': 'prior-objections'
  });

  const handleGenerateInsights = async (useCache: boolean = false) => {
    setIsLoading(true);
    setError(null);
    setTimeTaken(null);
    
    try {
      const startTime = performance.now();
      const response = await generateProductInsights(productId, useCache);
      const endTime = performance.now();
      setTimeTaken(endTime - startTime);
      
      setResult(response);
      
      if (!response.success) {
        setError(response.error || "Failed to generate insights");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      console.error("Error generating insights:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const startTime = performance.now();
      const response = await getProductInsights(productId);
      const endTime = performance.now();
      setTimeTaken(endTime - startTime);
      
      setResult(response);
      
      if (!response.success) {
        setError(response.error || "No insights found");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      console.error("Error fetching insights:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to render formatted quotes for benefits, pain points, etc.
  const renderQuotesList = (items: any[], keyField: string, examplesField: string = 'examples') => {
    return items.map((item, index) => (
      <div key={index} className="py-3 border-t first:border-t-0">
        <div className="flex items-start gap-2">
          {item.frequency && (
            <div className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs mt-1">
              {item.frequency}
            </div>
          )}
          <h4 className="font-medium">{item[keyField]}</h4>
        </div>
        {item[examplesField] && item[examplesField].length > 0 && (
          <div className="mt-2 pl-4 space-y-2">
            {item[examplesField].map((example: string, i: number) => (
              <div key={i} className="text-sm bg-slate-50 p-2 rounded border border-slate-100 italic">
                "{example}"
              </div>
            ))}
          </div>
        )}
      </div>
    ));
  };

  // Function to render simple list items
  const renderSimpleList = (items: string[]) => {
    return (
      <div className="space-y-2 mt-2">
        {items.map((item, index) => (
          <div key={index} className="p-2 bg-slate-50 rounded border">
            {item}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button 
          onClick={() => handleGenerateInsights(false)} 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate New Insights"
          )}
        </Button>
        
        <Button 
          onClick={handleFetchInsights} 
          variant="secondary" 
          disabled={isLoading}
        >
          Fetch Latest Insights
        </Button>
      </div>
      
      {timeTaken !== null && (
        <div className="text-sm text-muted-foreground">
          Operation completed in {(timeTaken / 1000).toFixed(2)} seconds
          {result?.cached && " (cached result)"}
        </div>
      )}
      
      {error && (
        <div className="text-sm p-3 bg-red-50 border border-red-200 rounded-md text-red-600">
          {error}
        </div>
      )}
      
      {result && result.success && (
        <Card className="mt-4">
          <CardHeader className="border-b">
            <CardTitle className="text-xl">
              Product Insights {result.cached && <span className="text-sm text-muted-foreground">(cached)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="customer-needs" className="w-full">
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="customer-needs" className="">Customer Needs</TabsTrigger>
                <TabsTrigger value="customer-personas" className="">Customer Personas</TabsTrigger>
                <TabsTrigger value="marketing-assets" className="">Marketing Assets</TabsTrigger>
                <TabsTrigger value="competitive-edge" className="">Competitive Edge</TabsTrigger>
              </TabsList>
              
              {/* Tab 1: Customer Needs & Pain Points */}
              <TabsContent value="customer-needs">
                <div className="px-3 rounded-lg">
                  <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
                    <Button 
                      variant={activeSubTab['customer-needs'] === 'benefits' ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setActiveSubTab({...activeSubTab, 'customer-needs': 'benefits'})}
                    >
                      Benefits
                    </Button>
                    <Button 
                      variant={activeSubTab['customer-needs'] === 'pain-points' ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setActiveSubTab({...activeSubTab, 'customer-needs': 'pain-points'})}
                    >
                      Pain Points
                    </Button>
                    <Button 
                      variant={activeSubTab['customer-needs'] === 'valued-features' ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setActiveSubTab({...activeSubTab, 'customer-needs': 'valued-features'})}
                    >
                      Valued Features
                    </Button>
                    <Button 
                      variant={activeSubTab['customer-needs'] === 'emotional-triggers' ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setActiveSubTab({...activeSubTab, 'customer-needs': 'emotional-triggers'})}
                    >
                      Emotional Triggers
                    </Button>
                  </div>
                </div>

                {/* Benefits */}
                {activeSubTab['customer-needs'] === 'benefits' && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 pb-2 border-b">Benefits Ranked by Frequency</h2>
                    <div className="divide-y">
                      {renderQuotesList(result.insights.benefits, 'benefit')}
                    </div>
                  </div>
                )}

                {/* Pain Points */}
                {activeSubTab['customer-needs'] === 'pain-points' && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 pb-2 border-b">Pain Points</h2>
                    <div className="divide-y">
                      {renderQuotesList(result.insights.painPoints, 'painPoint')}
                    </div>
                  </div>
                )}

                {/* Valued Features */}
                {activeSubTab['customer-needs'] === 'valued-features' && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 pb-2 border-b">Valued Features</h2>
                    <div className="divide-y">
                      {renderQuotesList(result.insights.valuedFeatures, 'feature')}
                    </div>
                  </div>
                )}
                
                {/* Emotional Triggers */}
                {activeSubTab['customer-needs'] === 'emotional-triggers' && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 pb-2 border-b">Emotional Triggers</h2>
                    <div className="divide-y">
                      {renderQuotesList(result.insights.emotionalTriggers, 'trigger')}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Tab 2: Customer Personas */}
              <TabsContent value="customer-personas" className="space-y-4">
                <h2 className="text-xl font-bold mb-4 pb-2 border-b">Customer Personas</h2>
                {result.insights.customerPersonas.map((persona: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="text-md font-bold mb-1">{persona.name}</h3>
                    <p className="text-sm mb-3">{persona.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Needs:</h4>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {persona.needs.map((need: string, i: number) => (
                            <li key={i}>{need}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Pain Points:</h4>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {persona.painPoints.map((pain: string, i: number) => (
                            <li key={i}>{pain}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* Tab 3: Marketing Assets */}
              <TabsContent value="marketing-assets" className="space-y-6">
                {/* Headlines */}
                <div>
                  <h2 className="text-xl font-bold mb-4 pb-2 border-b">Headlines</h2>
                  <div className="space-y-2">
                    {result.insights.headlines.map((headline: string, index: number) => (
                      <div key={index} className="p-3 bg-white border rounded shadow-sm font-medium">
                        {headline}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Hooks */}
                <div>
                  <h2 className="text-xl font-bold mb-4 pb-2 border-b">Hooks</h2>
                  <div className="space-y-2">
                    {result.insights.hooks.map((hook: string, index: number) => (
                      <div key={index} className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded border border-blue-100 font-medium">
                        {hook}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Objection Responses */}
                <div>
                  <h2 className="text-xl font-bold mb-4 pb-2 border-b">Objection Responses</h2>
                  <div className="divide-y">
                    {result.insights.objectionResponses.map((item: any, index: number) => (
                      <div key={index} className="py-3 border-t first:border-t-0">
                        <h4 className="font-medium">{item.objection}</h4>
                        <div className="mt-2 pl-4">
                          <div className="text-sm bg-green-50 p-2 rounded border border-green-100">
                            {item.response}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Trigger Events */}
                <div>
                  <h2 className="text-xl font-bold mb-4 pb-2 border-b">Trigger Events</h2>
                  {renderSimpleList(result.insights.triggerEvents)}
                </div>
              </TabsContent>

              {/* Tab 4: Competitive Edge */}
              <TabsContent value="competitive-edge">
                <div className="px-3 rounded-lg">
                  <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
                    <Button 
                      variant={activeSubTab['competitive-edge'] === 'prior-objections' ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setActiveSubTab({...activeSubTab, 'competitive-edge': 'prior-objections'})}
                    >
                      Prior Objections
                    </Button>
                    <Button 
                      variant={activeSubTab['competitive-edge'] === 'failed-solutions' ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setActiveSubTab({...activeSubTab, 'competitive-edge': 'failed-solutions'})}
                    >
                      Failed Solutions
                    </Button>
                    <Button 
                      variant={activeSubTab['competitive-edge'] === 'positioning' ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setActiveSubTab({...activeSubTab, 'competitive-edge': 'positioning'})}
                    >
                      Competitive Positioning
                    </Button>
                  </div>
                </div>

                {/* Prior Objections */}
                {activeSubTab['competitive-edge'] === 'prior-objections' && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 pb-2 border-b">Prior Objections</h2>
                    <div className="divide-y">
                      {renderQuotesList(result.insights.priorObjections, 'objection')}
                    </div>
                  </div>
                )}

                {/* Failed Solutions */}
                {activeSubTab['competitive-edge'] === 'failed-solutions' && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 pb-2 border-b">Failed Solutions</h2>
                    <div className="divide-y">
                      {renderQuotesList(result.insights.failedSolutions, 'solution')}
                    </div>
                  </div>
                )}
                
                {/* Competitive Positioning */}
                {activeSubTab['competitive-edge'] === 'positioning' && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 pb-2 border-b">Competitive Positioning</h2>
                    <div className="divide-y">
                      {result.insights.competitivePositioning.map((item: any, index: number) => (
                        <div key={index} className="py-3 border-t first:border-t-0">
                          <h4 className="font-medium">{item.angle}</h4>
                          <div className="mt-2 pl-4 text-sm">
                            {item.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
      
      {result && !result.success && (
        <div className="text-sm p-4 bg-amber-50 border border-amber-200 rounded-md">
          No insights available. Try generating new insights.
        </div>
      )}
    </div>
  );
} 