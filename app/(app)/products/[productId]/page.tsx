"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Settings, 
  Edit, 
  Save, 
  ExternalLink, 
  Upload, 
  Star, 
  Plus,
  BarChart,
  Link as LinkIcon,
  AlertCircle,
  Search
} from "lucide-react";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";
import { getTrustpilotReviews } from "@/app/actions/trustpilot";

interface ProductPageProps {
  params: {
    productId: string;
  };
}

interface ProductMetadata {
  url?: string;
  description?: string;
  trustpilot_url?: string;
  is_competitor?: boolean;
  resources?: { name: string; url: string }[];
  competitors?: { name: string; url: string }[];
  [key: string]: any;
}

interface Product {
  id: string;
  name: string;
  created_at: string;
  metadata: ProductMetadata;
}

export default function ProductPage({ params }: ProductPageProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  
  // Fetch product data when component mounts
  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", params.productId)
        .single();
      
      if (error) {
        console.error("Error fetching product:", error);
        setFetchError(error.message);
      } else {
        setProduct(data);
      }
      
      setIsLoading(false);
    };
    
    fetchProduct();
  }, [params.productId, supabase]);
  
  const handleInputChange = (field: string, value: string) => {
    if (!product) return;
    
    setProduct({ 
      ...product, 
      [field]: value 
    });
  };
  
  const handleMetadataChange = (field: string, value: any) => {
    if (!product) return;
    
    setProduct({ 
      ...product, 
      metadata: { 
        ...product.metadata, 
        [field]: value 
      } 
    });
  };
  
  const handleAddResource = () => {
    if (!product) return;
    
    const resources = product.metadata.resources || [];
    setProduct({
      ...product,
      metadata: {
        ...product.metadata,
        resources: [
          ...resources,
          { name: "New Resource", url: "" }
        ]
      }
    });
  };
  
  const handleRemoveResource = (index: number) => {
    if (!product || !product.metadata.resources) return;
    
    const resources = [...product.metadata.resources];
    resources.splice(index, 1);
    
    setProduct({
      ...product,
      metadata: {
        ...product.metadata,
        resources
      }
    });
  };
  
  const handleResourceChange = (index: number, field: string, value: string) => {
    if (!product || !product.metadata.resources) return;
    
    const resources = [...product.metadata.resources];
    resources[index] = {
      ...resources[index],
      [field]: value
    };
    
    setProduct({
      ...product,
      metadata: {
        ...product.metadata,
        resources
      }
    });
  };

  const handleAddCompetitor = () => {
    if (!product) return;
    
    const competitors = product.metadata.competitors || [];
    setProduct({
      ...product,
      metadata: {
        ...product.metadata,
        competitors: [
          ...competitors,
          { name: "New Competitor", url: "" }
        ]
      }
    });
  };
  
  const handleRemoveCompetitor = (index: number) => {
    if (!product || !product.metadata.competitors) return;
    
    const competitors = [...product.metadata.competitors];
    competitors.splice(index, 1);
    
    setProduct({
      ...product,
      metadata: {
        ...product.metadata,
        competitors
      }
    });
  };
  
  const handleCompetitorChange = (index: number, field: string, value: string) => {
    if (!product || !product.metadata.competitors) return;
    
    const competitors = [...product.metadata.competitors];
    competitors[index] = {
      ...competitors[index],
      [field]: value
    };
    
    setProduct({
      ...product,
      metadata: {
        ...product.metadata,
        competitors
      }
    });
  };

  const handleSaveProduct = async () => {
    if (!product) return;
    
    setIsSaving(true);
    
    const { error } = await supabase
      .from('products')
      .update({
        name: product.name,
        metadata: product.metadata
      })
      .eq('id', params.productId);
    
    if (error) {
      console.error("Error updating product:", error);
      // Show error notification here
    } else {
      // Show success notification here
    }
    
    setIsSaving(false);
    setIsEditing(false);
    router.refresh();
  };
  
  const handleStartChat = () => {
    // Navigate to chat page with the product ID
    router.push(`/chat/new?productId=${params.productId}`);
  };

  const handleTestTrustpilot = async () => {
    if (!product || !product.metadata.url) {
      alert("Please add a product URL first to test Trustpilot reviews");
      return;
    }
    
    try {
      // Extract domain from URL for the Trustpilot search
      let domain = product.metadata.url;
      try {
        const url = new URL(domain);
        domain = url.hostname;
      } catch (error) {
        // If URL parsing fails, just use the raw value
      }
      
      console.log("Testing Trustpilot scraper for domain:", domain);
      
      // Call the Trustpilot server action
      const results = await getTrustpilotReviews(domain);
      
      // Log the complete results to console
      console.log("Trustpilot Reviews Results:", results);
      
      if (results.success) {
        alert(`Successfully fetched ${results.data?.length || 0} Trustpilot reviews. Check the console for details.`);
      } else {
        alert(`Error fetching Trustpilot reviews: ${results.error}`);
      }
    } catch (error) {
      console.error("Error calling Trustpilot API:", error);
      alert("Error calling Trustpilot API. Check console for details.");
    }
  };

  const chatPrompts = [
    {
      category: "Customer Insights",
      prompts: [
        {
          title: "Find winning concepts from reviews",
      description: "Analyze customer reviews to identify successful marketing angles",
          icon: <Star className="h-4 w-4 text-amber-500" />
    },
    {
          title: "Summarize negative reviews",
      description: "Get insights from negative feedback to improve marketing strategy",
          icon: <MessageSquare className="h-4 w-4 text-red-500" />
        }
      ]
    },
    {
      category: "Content Creation",
      prompts: [
        {
          title: "Build a storyboard for my next ad",
      description: "Create a compelling narrative structure for your advertisement",
          icon: <Upload className="h-4 w-4 text-blue-500" />
    },
    {
          title: "Identify top purchase triggers",
      description: "Identify key factors that drive customer purchasing decisions",
          icon: <BarChart className="h-4 w-4 text-green-500" />
        }
      ]
    }
  ];

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto p-6 flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading product information...</p>
        </div>
      </div>
    );
  }
  
  if (fetchError || !product) {
    return (
      <div className="container max-w-6xl mx-auto p-6 flex items-center justify-center h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Error Loading Product
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{fetchError || "Unable to load product information"}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/products')}>
              Return to Products
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center text-2xl font-bold">
            {product.name.charAt(0)}
          </div>
          <div>
            {isEditing ? (
              <Input
                value={product.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="text-xl font-bold mb-1 h-9"
              />
            ) : (
              <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
            )}
            <p className="text-sm text-muted-foreground">
              {isEditing ? (
                <Input
                  value={product.metadata.url || ''}
                  onChange={(e) => handleMetadataChange('url', e.target.value)}
                  placeholder="Add product URL"
                  className="mt-1 text-sm"
                />
              ) : product.metadata.url ? (
                <a href={product.metadata.url} target="_blank" rel="noopener noreferrer" className="flex items-center hover:underline text-blue-500">
                  <ExternalLink className="h-3 w-3 mr-1" /> View product
                </a>
              ) : (
                "No product URL added"
              )}
            </p>
          </div>
        </div>
        
            <div className="flex flex-col sm:flex-row gap-2">
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveProduct} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" /> Edit Product
              </Button>
              <Button onClick={handleStartChat}>
                <MessageSquare className="h-4 w-4 mr-2" /> Start New Chat
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="details">Product Details</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="chats">Previous Chats</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4 pb-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
              <CardDescription>
                Manage your product details and metadata
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                {isEditing ? (
                  <Textarea
                    id="description"
                    value={product.metadata.description || ''}
                    onChange={(e) => handleMetadataChange('description', e.target.value)}
                    placeholder="Add a description for your product"
                    className="min-h-[100px]"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{product.metadata.description || "No description added"}</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productUrl">Product URL</Label>
                  {isEditing ? (
                    <Input
                      id="productUrl"
                      value={product.metadata.url || ''}
                      onChange={(e) => handleMetadataChange('url', e.target.value)}
                      placeholder="https://your-product.com"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {product.metadata.url ? (
                        <a href={product.metadata.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          {product.metadata.url}
                        </a>
                      ) : "No URL added"}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="trustpilot">Trustpilot URL</Label>
                  <div className="flex flex-col space-y-2">
                    {isEditing ? (
                      <Input
                        id="trustpilot"
                        value={product.metadata.trustpilot_url || ''}
                        onChange={(e) => handleMetadataChange('trustpilot_url', e.target.value)}
                        placeholder="https://trustpilot.com/review/your-product"
                      />
                    ) : (
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          {product.metadata.trustpilot_url ? (
                            <a href={product.metadata.trustpilot_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                              {product.metadata.trustpilot_url}
                            </a>
                          ) : "No Trustpilot URL added"}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleTestTrustpilot}
                          className="flex items-center gap-1"
                        >
                          <Search className="h-3.5 w-3.5" />
                          Test Trustpilot
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Product Resources */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label>Product Resources</Label>
                  {isEditing && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAddResource}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Resource
                    </Button>
                  )}
                </div>
                
                {product.metadata.resources?.length ? (
                  <div className="space-y-3 max-h-[180px] overflow-y-auto border rounded-md p-3">
                    {product.metadata.resources.map((resource, index) => (
                      <div key={index} className={`flex items-center gap-2 ${isEditing ? 'mb-2' : ''}`}>
                        <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        
                        {isEditing ? (
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 w-full">
                            <Input
                              className="md:col-span-2"
                              value={resource.name}
                              onChange={(e) => handleResourceChange(index, 'name', e.target.value)}
                              placeholder="Resource name"
                            />
                            <Input
                              className="md:col-span-2"
                              value={resource.url}
                              onChange={(e) => handleResourceChange(index, 'url', e.target.value)}
                              placeholder="https://example.com"
                            />
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:text-destructive/90"
                              onClick={() => handleRemoveResource(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{resource.name}</span>
                            <a 
                              href={resource.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-xs text-blue-500 hover:underline"
                            >
                              {resource.url}
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No resources added yet</p>
                )}
              </div>
              
              {/* Competitors Section */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label>Competitors</Label>
                  {isEditing && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAddCompetitor}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Competitor
                    </Button>
                  )}
                </div>
                
                {product.metadata.competitors?.length ? (
                  <div className="space-y-3 max-h-[180px] overflow-y-auto border rounded-md p-3">
                    {product.metadata.competitors.map((competitor, index) => (
                      <div key={index} className={`flex items-center gap-2 ${isEditing ? 'mb-2' : ''}`}>
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                        
                        {isEditing ? (
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 w-full">
                            <Input
                              className="md:col-span-2"
                              value={competitor.name}
                              onChange={(e) => handleCompetitorChange(index, 'name', e.target.value)}
                              placeholder="Competitor name"
                            />
                            <Input
                              className="md:col-span-2"
                              value={competitor.url}
                              onChange={(e) => handleCompetitorChange(index, 'url', e.target.value)}
                              placeholder="https://competitor.com"
                            />
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:text-destructive/90"
                              onClick={() => handleRemoveCompetitor(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{competitor.name}</span>
                            {competitor.url && (
                              <a 
                                href={competitor.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-xs text-blue-500 hover:underline"
                              >
                                {competitor.url}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No competitors added yet</p>
                )}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label>Product Image</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Drag and drop an image, or click to browse</p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Upload Image
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="insights" className="pb-6">
          <div className="space-y-6">
            {chatPrompts.map((category, idx) => (
              <div key={idx} className="space-y-3">
                <h2 className="text-lg font-medium">{category.category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.prompts.map((prompt, index) => (
                    <Card key={index} className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {prompt.icon}
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{prompt.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{prompt.description}</p>
                </div>
              </div>
            </Card>
                  ))}
                  
                  <Card className="p-4 border-dashed hover:bg-muted/20 cursor-pointer transition-colors">
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="p-2 bg-muted rounded-full mx-auto w-fit mb-2">
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">Create custom prompt</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
          ))}
        </div>
        </TabsContent>
        
        <TabsContent value="chats" className="pb-6">
          <Card>
            <CardHeader>
              <CardTitle>Previous chats about {product.name}</CardTitle>
              <CardDescription>
                View your conversation history about this product
              </CardDescription>
            </CardHeader>
            <CardContent>
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                      <h3 className="font-medium text-foreground">{product.name} reduces your Tan lines</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                        I've been using the {product.name} for a week now, and I can already see a reduction in my tan lines.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Created on May 15, 2023
                  </p>
                </div>
              </div>
            </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Competitor analysis: {product.name} vs alternatives</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Analyzed how {product.name} compares to top 3 competitors in the market.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Created on April 28, 2023
                      </p>
          </div>
        </div>
                </Card>
                
                <Button variant="outline" className="w-full" onClick={handleStartChat}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Start New Chat
                </Button>
      </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 