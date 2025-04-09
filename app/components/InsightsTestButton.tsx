"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
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

  // Load insights on initial render
  useEffect(() => {
    if (!result && !isLoading) {
      fetchInsights();
    }
  }, [productId]);

  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setError(null);
    setTimeTaken(null);
    
    try {
      const startTime = performance.now();
      const response = await generateProductInsights(productId, false);
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

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const startTime = performance.now();
      const response = await getProductInsights(productId);
      const endTime = performance.now();
      setTimeTaken(endTime - startTime);
      
      setResult(response);
      
      if (!response.success) {
        // If no existing insights found, generate new ones
        await handleGenerateInsights();
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">
            AI Marketing Insights Generator
          </CardTitle>
          <Button 
            onClick={handleGenerateInsights} 
            disabled={isLoading}
            size="sm"
            className="gap-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Generate New Insights
              </>
            )}
          </Button>
        </div>
        <p className="text-muted-foreground text-sm mt-2">
          Generate comprehensive marketing insights based on customer reviews. This tool analyzes customer feedback to identify key benefits, pain points, objections, and more to help optimize your marketing strategy.
        </p>
        {timeTaken !== null && (
          <div className="text-xs text-muted-foreground mt-1">
            Operation completed in {(timeTaken / 1000).toFixed(2)} seconds
            {result?.cached && " (cached result)"}
          </div>
        )}
      </CardHeader>
      
      {error && (
        <div className="text-sm p-3 bg-red-50 border border-red-200 rounded-md text-red-600 mx-6 my-4">
          {error}
        </div>
      )}
      
      {isLoading && !result && (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {result && result.success && (
        <CardContent className="p-0">
          <Tabs defaultValue="customer-needs" className="w-full">
            <div className="border-b px-6 py-2">
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="customer-needs" className="text-sm">Customer Needs</TabsTrigger>
                <TabsTrigger value="customer-personas" className="text-sm">Customer Personas</TabsTrigger>
                <TabsTrigger value="marketing-assets" className="text-sm">Marketing Assets</TabsTrigger>
                <TabsTrigger value="competitive-edge" className="text-sm">Competitive Edge</TabsTrigger>
              </TabsList>
            </div>
            
            {/* Tab 1: Customer Needs & Pain Points */}
            <TabsContent value="customer-needs" className="px-6 py-4">
              <div className="p-3 rounded-lg">
                <div className="flex space-x-2 overflow-x-auto pb-2">
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
            <TabsContent value="customer-personas" className="px-6 py-4 space-y-4">
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
            <TabsContent value="marketing-assets" className="px-6 py-4 space-y-5">
              <h2 className="text-xl font-bold mb-4 pb-2 border-b">Marketing Assets</h2>
              {/* Headlines */}
              <div>
                <h2 className="text-lg font-semibold mb-3 pb-2 border-b">Headlines</h2>
                <div className="space-y-2">
                  {result.insights.headlines.map((headline: string, index: number) => (
                    <div key={index} className="p-2 bg-white border rounded shadow-sm text-sm">
                      {headline}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Hooks */}
              <div>
                <h2 className="text-lg font-semibold mb-3 pb-2 border-b">Hooks</h2>
                <div className="space-y-2">
                  {result.insights.hooks.map((hook: string, index: number) => (
                    <div key={index} className="p-2 bg-white border rounded shadow-sm text-sm">
                      {hook}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Objection Responses */}
              <div>
                <h2 className="text-lg font-semibold mb-3 pb-2 border-b">Objection Responses</h2>
                <div className="divide-y">
                  {result.insights.objectionResponses.map((item: any, index: number) => (
                    <div key={index} className="py-2 border-t first:border-t-0">
                      <h4 className="text-sm font-medium">{item.objection}</h4>
                      <div className="mt-1 pl-3">
                        <div className="text-sm bg-white border rounded shadow-sm p-2">
                          {item.response}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Trigger Events */}
              <div>
                <h2 className="text-lg font-semibold mb-3 pb-2 border-b">Trigger Events</h2>
                <div className="space-y-2">
                  {result.insights.triggerEvents.map((item: string, index: number) => (
                    <div key={index} className="p-2 bg-white border rounded shadow-sm text-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Competitive Edge */}
            <TabsContent value="competitive-edge" className="px-6 py-4">
              <div className="p-3 rounded-lg">
                <div className="flex space-x-2 overflow-x-auto pb-2">
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
      )}
      
      {result && !result.success && !isLoading && (
        <div className="text-sm p-4 bg-amber-50 border border-amber-200 rounded-md mx-6 my-4">
          No insights available. Try generating new insights.
        </div>
      )}
    </Card>
  );
} 