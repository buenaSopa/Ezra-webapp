"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { generateProductInsights, getProductInsights } from "@/app/actions/insights-actions";

export default function InsightsTestButton({ productId }: { productId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState("benefits");
  const [error, setError] = useState<string | null>(null);

  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await generateProductInsights(productId);
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
      const response = await getProductInsights(productId);
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

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button 
          onClick={handleGenerateInsights} 
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
          variant="outline" 
          disabled={isLoading}
        >
          Fetch Latest Insights
        </Button>
      </div>
      
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
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="mb-4 flex-wrap">
                <TabsTrigger value="benefits">Benefits</TabsTrigger>
                <TabsTrigger value="painPoints">Pain Points</TabsTrigger>
                <TabsTrigger value="features">Valued Features</TabsTrigger>
                <TabsTrigger value="objections">Objections</TabsTrigger>
                <TabsTrigger value="failed">Failed Solutions</TabsTrigger>
                <TabsTrigger value="emotional">Emotional Triggers</TabsTrigger>
                <TabsTrigger value="personas">Personas</TabsTrigger>
                <TabsTrigger value="headlines">Headlines</TabsTrigger>
                <TabsTrigger value="positioning">Positioning</TabsTrigger>
                <TabsTrigger value="triggers">Trigger Events</TabsTrigger>
                <TabsTrigger value="responses">Objection Responses</TabsTrigger>
                <TabsTrigger value="hooks">Hooks</TabsTrigger>
              </TabsList>
              
              <TabsContent value="benefits" className="space-y-4">
                <h3 className="text-lg font-medium">Benefits Ranked by Frequency</h3>
                <div className="divide-y">
                  {result.insights.benefits.map((item: any, index: number) => (
                    <div key={index} className="py-3">
                      <div className="flex items-start gap-2">
                        <div className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs">
                          {item.frequency}
                        </div>
                        <h4 className="font-medium">{item.benefit}</h4>
                      </div>
                      <div className="mt-2 pl-7 space-y-2">
                        {item.examples.map((example: string, i: number) => (
                          <div key={i} className="text-sm bg-slate-50 p-2 rounded border border-slate-100 italic">
                            "{example}"
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="painPoints" className="space-y-4">
                <h3 className="text-lg font-medium">Pain Points Customers Had Before</h3>
                <div className="divide-y">
                  {result.insights.painPoints.map((item: any, index: number) => (
                    <div key={index} className="py-3">
                      <h4 className="font-medium">{item.painPoint}</h4>
                      <div className="mt-2 space-y-2">
                        {item.examples.map((example: string, i: number) => (
                          <div key={i} className="text-sm bg-slate-50 p-2 rounded border border-slate-100 italic">
                            "{example}"
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              {/* Remaining tab content components would follow the same pattern */}
              {/* For brevity, I'm only including the first two tabs in detail */}
              
              <TabsContent value="features">
                <h3 className="text-lg font-medium">Features They Value Most</h3>
                <pre className="text-xs overflow-auto p-4 bg-slate-50 rounded">
                  {JSON.stringify(result.insights.valuedFeatures, null, 2)}
                </pre>
              </TabsContent>
              
              <TabsContent value="objections">
                <h3 className="text-lg font-medium">Prior Objections They Overcame</h3>
                <pre className="text-xs overflow-auto p-4 bg-slate-50 rounded">
                  {JSON.stringify(result.insights.priorObjections, null, 2)}
                </pre>
              </TabsContent>
              
              <TabsContent value="failed">
                <h3 className="text-lg font-medium">Failed Solutions They Tried First</h3>
                <pre className="text-xs overflow-auto p-4 bg-slate-50 rounded">
                  {JSON.stringify(result.insights.failedSolutions, null, 2)}
                </pre>
              </TabsContent>
              
              <TabsContent value="emotional">
                <h3 className="text-lg font-medium">Emotional Triggers Driving Purchases</h3>
                <pre className="text-xs overflow-auto p-4 bg-slate-50 rounded">
                  {JSON.stringify(result.insights.emotionalTriggers, null, 2)}
                </pre>
              </TabsContent>
              
              <TabsContent value="personas">
                <h3 className="text-lg font-medium">Customer Personas</h3>
                <pre className="text-xs overflow-auto p-4 bg-slate-50 rounded">
                  {JSON.stringify(result.insights.customerPersonas, null, 2)}
                </pre>
              </TabsContent>
              
              <TabsContent value="headlines">
                <h3 className="text-lg font-medium">Ready-to-Use Static Headlines</h3>
                <div className="space-y-2">
                  {result.insights.headlines.map((headline: string, index: number) => (
                    <div key={index} className="p-3 bg-white border rounded shadow-sm font-medium">
                      {headline}
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="positioning">
                <h3 className="text-lg font-medium">Competitive Positioning Angles</h3>
                <pre className="text-xs overflow-auto p-4 bg-slate-50 rounded">
                  {JSON.stringify(result.insights.competitivePositioning, null, 2)}
                </pre>
              </TabsContent>
              
              <TabsContent value="triggers">
                <h3 className="text-lg font-medium">Specific Trigger Events</h3>
                <div className="space-y-2 mt-4">
                  {result.insights.triggerEvents.map((event: string, index: number) => (
                    <div key={index} className="p-2 bg-slate-50 rounded border">
                      {event}
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="responses">
                <h3 className="text-lg font-medium">Responses to Common Objections</h3>
                <pre className="text-xs overflow-auto p-4 bg-slate-50 rounded">
                  {JSON.stringify(result.insights.objectionResponses, null, 2)}
                </pre>
              </TabsContent>
              
              <TabsContent value="hooks">
                <h3 className="text-lg font-medium">One-Liners for Hooks</h3>
                <div className="space-y-2 mt-4">
                  {result.insights.hooks.map((hook: string, index: number) => (
                    <div key={index} className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded border border-blue-100 font-medium">
                      {hook}
                    </div>
                  ))}
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