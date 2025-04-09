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
          <CardHeader>
            <CardTitle className="flex justify-between">
              <span>Product Insights {result.cached && <span className="text-sm text-muted-foreground">(cached)</span>}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="customer-needs" className="w-full">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="customer-needs">Customer Needs</TabsTrigger>
                <TabsTrigger value="customer-personas">Customer Personas</TabsTrigger>
                <TabsTrigger value="marketing-assets">Marketing Assets</TabsTrigger>
                <TabsTrigger value="competitive-edge">Competitive Edge</TabsTrigger>
              </TabsList>
              
              {/* Tab 1: Customer Needs & Pain Points */}
              <TabsContent value="customer-needs" className="space-y-6">
                {/* Benefits */}
                <div>
                  <h3 className="text-md font-semibold mb-2">Benefits Ranked by Frequency</h3>
                  <div className="divide-y">
                    {renderQuotesList(result.insights.benefits, 'benefit')}
                  </div>
                </div>

                {/* Pain Points */}
                <div>
                  <h3 className="text-md font-semibold mb-2">Pain Points</h3>
                  <div className="divide-y">
                    {renderQuotesList(result.insights.painPoints, 'painPoint')}
                  </div>
                </div>

                {/* Valued Features */}
                <div>
                  <h3 className="text-md font-semibold mb-2">Valued Features</h3>
                  <div className="divide-y">
                    {renderQuotesList(result.insights.valuedFeatures, 'feature')}
                  </div>
                </div>
                
                {/* Emotional Triggers */}
                <div>
                  <h3 className="text-md font-semibold mb-2">Emotional Triggers</h3>
                  <div className="divide-y">
                    {renderQuotesList(result.insights.emotionalTriggers, 'trigger')}
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Customer Personas */}
              <TabsContent value="customer-personas" className="space-y-4">
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
                  <h3 className="text-md font-semibold mb-2">Headlines</h3>
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
                  <h3 className="text-md font-semibold mb-2">Hooks</h3>
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
                  <h3 className="text-md font-semibold mb-2">Objection Responses</h3>
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
                  <h3 className="text-md font-semibold mb-2">Trigger Events</h3>
                  {renderSimpleList(result.insights.triggerEvents)}
                </div>
              </TabsContent>

              {/* Tab 4: Competitive Edge */}
              <TabsContent value="competitive-edge" className="space-y-6">
                {/* Prior Objections */}
                <div>
                  <h3 className="text-md font-semibold mb-2">Prior Objections</h3>
                  <div className="divide-y">
                    {renderQuotesList(result.insights.priorObjections, 'objection')}
                  </div>
                </div>

                {/* Failed Solutions */}
                <div>
                  <h3 className="text-md font-semibold mb-2">Failed Solutions</h3>
                  <div className="divide-y">
                    {renderQuotesList(result.insights.failedSolutions, 'solution')}
                  </div>
                </div>
                
                {/* Competitive Positioning */}
                <div>
                  <h3 className="text-md font-semibold mb-2">Competitive Positioning</h3>
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