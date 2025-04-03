"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";
import { startTrustpilotReviewScraping } from "@/app/actions/trustpilot";
import { getAmazonReviews } from "@/app/actions/amazon";
import { refreshAllReviews } from "@/app/services/reviewService";
import { toast, Toaster } from "sonner";
import useSWR from 'swr';
import { getScrapingJobsForProduct } from '@/app/actions/scraping-jobs';

// Import custom components
import { ProductHeader } from "@/components/products/ProductHeader";
import { ProductDetails } from "@/components/products/ProductDetails";
import { ProductResources } from "@/components/products/ProductResources";
import { ProductCompetitors } from "@/components/products/ProductCompetitors";
import { ProductImage } from "@/components/products/ProductImage";
import DefaultInsightsTab from "@/components/products/InsightsTab";
import DefaultChatsTab from "@/components/products/ChatsTab";

// Define interfaces for the page
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
  image_url?: string;
  amazon_asin?: string;
  [key: string]: any;
}

interface Product {
  id: string;
  name: string;
  created_at: string;
  last_reviews_scraped_at?: string;
  last_indexed_at?: string;
  metadata: ProductMetadata;
}

// Interface for competitor relationship
interface ProductCompetitor {
  id: string;
  product_id: string;
  competitor_product_id: string;
  relationship_type: string;
  created_at: string;
  competitor?: Product;
}

export default function ProductPage({ params }: ProductPageProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingReviews, setIsRefreshingReviews] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [competitors, setCompetitors] = useState<ProductCompetitor[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [editingCompetitorId, setEditingCompetitorId] = useState<string | null>(null);
  const [editedCompetitor, setEditedCompetitor] = useState<Product | null>(null);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [hasRunningJobs, setHasRunningJobs] = useState<boolean>(false);
  const [isStartingChat, setIsStartingChat] = useState<boolean>(false);
  
  // Define the handleRefreshAllReviews function with useCallback
  const handleRefreshAllReviews = useCallback(async (includeCompetitors = false, skipToast = false) => {
    if (!product) return;
    
    setIsRefreshingReviews(true);
    
    try {
      const results = await refreshAllReviews(params.productId, true, includeCompetitors);
      console.log("All reviews refresh results:", results);
      
      if (!results.success) {
        toast.error("Error initiating review scraping", {
          description: results.error || "An unknown error occurred"
        });
      }
    } catch (error) {
      console.error("Error refreshing reviews:", error);
      
      toast.error("Error initiating review scraping", {
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsRefreshingReviews(false);
    }
  }, [product, params.productId, setIsRefreshingReviews]);
  
  // Use SWR to fetch scraping job status and refresh automatically
  const { data: scrapingData } = useSWR(
    ['scraping-jobs', params.productId],
    async () => {
      const result = await getScrapingJobsForProduct(params.productId);
      if (!result.success) {
        return { jobs: [] };
      }
      return result;
    },
    { refreshInterval: 5000 } // Refresh every 5 seconds
  );
  
  // Update hasRunningJobs state when scraping data changes
  useEffect(() => {
    // Check if there are any running jobs
    const hasRunning = scrapingData?.jobs?.some(job => 
      job.status === 'running' || job.status === 'indexing' || job.status === 'queued'
    ) || false;
    
    setHasRunningJobs(hasRunning);
  }, [scrapingData]);
  
  // Determine the overall scraping status
  const getScrapingStatus = () => {
    if (!scrapingData || !scrapingData.jobs || scrapingData.jobs.length === 0) {
      return {
        text: 'Ready',
        color: 'text-green-500',
        isReady: true
      };
    }
    
    // Check for active jobs - prioritize any running/indexing jobs
    const runningJob = scrapingData.jobs.find(job => 
      job.status === 'running' || job.status === 'indexing' || job.status === 'queued'
    );
    
    if (runningJob) {
      if (runningJob.status === 'indexing') {
        return {
          text: 'Vectorizing...',
          color: 'text-blue-500',
          isReady: false
        };
      }
      
      return {
        text: 'Loading...',
        color: 'text-blue-500',
        isReady: false
      };
    }
    
    // Check for recently completed jobs - any indexed job is good!
    const indexed = scrapingData.jobs.some(job => job.status === 'indexed');
    if (indexed) {
      return {
        text: 'Ready',
        color: 'text-green-500',
        isReady: true
      };
    }
    
    // Check for failed jobs
    const failed = scrapingData.jobs.some(job => job.status === 'failed' || job.status === 'index_failed');
    if (failed) {
      return {
        text: 'Warning',
        color: 'text-amber-500',
        isReady: true
      };
    }
    
    // Default - likely just 'completed' without indexing
    return {
      text: 'Ready',
      color: 'text-green-500',
      isReady: true
    };
  };
  
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
        
        // Check if this is a newly created product without reviews
        if (!data.last_reviews_scraped_at && 
            (data.metadata?.url || data.metadata?.amazon_asin) && 
            !isRefreshingReviews) {
          console.log("Auto-triggering review scraping for new product");
          
          // Wait a moment to allow UI to render first
          setTimeout(() => {
            handleRefreshAllReviews(true, true).catch(err => {
              console.error("Error in auto-triggered scraping:", err);
              toast.error("Error starting automatic review scraping", {
                description: err instanceof Error ? err.message : "An unknown error occurred"
              });
            });
          }, 1000);
        }
      }
      
      setIsLoading(false);
    };
    
    fetchProduct();
  }, [params.productId, supabase, isRefreshingReviews]);
  
  // Fetch review count
  useEffect(() => {
    const fetchReviewCount = async () => {
      if (!params.productId || !product) return;
      
      // Count direct reviews linked to product_id
      const { count: directCount, error: directError } = await supabase
        .from("reviews")
        .select("*", { count: 'exact', head: true })
        .eq("product_id", params.productId);
      
      if (directError) {
        console.error("Error fetching direct review count:", directError);
      }
      
      // Get product metadata for URL and ASIN matching
      const productUrl = product.metadata?.url;
      const amazonAsin = product.metadata?.amazon_asin;
      
      let sourceReviewCount = 0;
      
      // If we have a product URL, count Trustpilot reviews
      if (productUrl) {
        try {
          // Extract domain from URL for Trustpilot matching
          let domain = productUrl;
          try {
            const url = new URL(domain);
            domain = url.hostname;
          } catch (error) {
            // If URL parsing fails, just use the raw value
            console.warn("Failed to parse URL for domain extraction:", error);
          }
          
          const { count: trustpilotCount, error: trustpilotError } = await supabase
            .from("review_sources")
            .select("*", { count: 'exact', head: true })
            .eq("product_source", domain)
            .eq("source", "trustpilot");
          
          if (trustpilotError) {
            console.error("Error fetching Trustpilot review count:", trustpilotError);
          } else if (trustpilotCount !== null) {
            sourceReviewCount += trustpilotCount;
          }
        } catch (error) {
          console.error("Error processing Trustpilot reviews:", error);
        }
      }
      
      // If we have an Amazon ASIN, count Amazon reviews
      if (amazonAsin) {
        try {
          const { count: amazonCount, error: amazonError } = await supabase
            .from("review_sources")
            .select("*", { count: 'exact', head: true })
            .eq("product_source", amazonAsin)
            .eq("source", "amazon");
          
          if (amazonError) {
            console.error("Error fetching Amazon review count:", amazonError);
          } else if (amazonCount !== null) {
            sourceReviewCount += amazonCount;
          }
        } catch (error) {
          console.error("Error processing Amazon reviews:", error);
        }
      }
      
      // Combine the counts
      const totalCount = (directCount || 0) + sourceReviewCount;
      setReviewCount(totalCount);
      
      console.log(`Total review count: ${totalCount} (Direct: ${directCount || 0}, Source: ${sourceReviewCount})`);
    };
    
    fetchReviewCount();
  }, [params.productId, supabase, product]);
  
  // Add new effect to fetch competitors
  useEffect(() => {
    const fetchCompetitors = async () => {
      if (!product) return;
      
      // First fetch the product_to_competitors entries for this product
      const { data: competitorRelations, error: relationsError } = await supabase
        .from("product_to_competitors")
        .select("*")
        .eq("product_id", params.productId);
      
      if (relationsError) {
        console.error("Error fetching competitor relations:", relationsError);
        return;
      }
      
      // Then fetch the actual competitor products
      if (competitorRelations && competitorRelations.length > 0) {
        // Get all competitor product IDs
        const competitorIds = competitorRelations.map(r => r.competitor_product_id);
        
        // Fetch all competitor products in a single query
        const { data: competitorProducts, error: productsError } = await supabase
          .from("products")
          .select("*")
          .in("id", competitorIds);
        
        if (productsError) {
          console.error("Error fetching competitor products:", productsError);
          return;
        }
        
        // Combine the relations with their product data
        const enrichedCompetitors = competitorRelations.map(relation => {
          const competitorProduct = competitorProducts?.find(p => p.id === relation.competitor_product_id);
          return {
            ...relation,
            competitor: competitorProduct
          };
        });
        
        setCompetitors(enrichedCompetitors);
      } else {
        setCompetitors([]);
      }
      
      // Also fetch available products to use as potential competitors
      const { data: allProducts, error: productsError } = await supabase
        .from("products")
        .select("*")
        .neq("id", params.productId) // Exclude current product
        .order("name");
      
      if (productsError) {
        console.error("Error fetching available products:", productsError);
      } else {
        setAvailableProducts(allProducts || []);
      }
    };
    
    fetchCompetitors();
  }, [product, params.productId, supabase]);
  
  // Product field change handlers
  const handleInputChange = (field: string, value: string) => {
    if (!product) return;
    
    setProduct({ 
      ...product, 
      [field]: value 
    });
  };
  
  const handleMetadataChange = (field: string, value: any) => {
    if (!product) return;
    
    // Special handling for amazon_asin field - ensure it's always trimmed
    if (field === 'amazon_asin' && typeof value === 'string') {
      value = value.trim();
    }
    
    setProduct({ 
      ...product, 
      metadata: { 
        ...product.metadata, 
        [field]: value 
      } 
    });
  };
  
  // Resource management handlers
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

  // Competitor management handlers
  const handleAddCompetitor = async (competitorId: string) => {
    if (!product) return;
    
    // Add to product_to_competitors table with correct column names
    const { error } = await supabase
      .from("product_to_competitors")
      .insert({
        product_id: params.productId,
        competitor_product_id: competitorId,
        relationship_type: "direct_competitor"
      });
    
    if (error) {
      console.error("Error adding competitor:", error);
      alert("Error adding competitor: " + error.message);
    } else {
      // Refresh the competitors
      const fetchCompetitors = async () => {
        // First fetch the relations
        const { data: relations, error: relErr } = await supabase
          .from("product_to_competitors")
          .select("*")
          .eq("product_id", params.productId);
          
        if (relErr || !relations) {
          console.error("Error refreshing competitor relations:", relErr);
          return;
        }
          
        // Then fetch the products
        const competitorIds = relations.map(r => r.competitor_product_id);
        
        if (competitorIds.length) {
          const { data: products, error: prodErr } = await supabase
            .from("products")
            .select("*")
            .in("id", competitorIds);
            
          if (prodErr) {
            console.error("Error refreshing competitor products:", prodErr);
            return;
          }
          
          // Combine data
          const enriched = relations.map(rel => ({
            ...rel,
            competitor: products?.find(p => p.id === rel.competitor_product_id)
          }));
          
          setCompetitors(enriched);
        } else {
          setCompetitors([]);
        }
      };
      
      fetchCompetitors();
    }
  };
  
  const handleRemoveCompetitor = async (relationId: string) => {
    // Delete from product_to_competitors table
    const { error } = await supabase
      .from("product_to_competitors")
      .delete()
      .eq("id", relationId);
    
    if (error) {
      console.error("Error removing competitor:", error);
      alert("Error removing competitor: " + error.message);
    } else {
      // Update local state
      setCompetitors(competitors.filter(c => c.id !== relationId));
    }
  };
  
  const handleEditCompetitor = (relation: ProductCompetitor) => {
    if (!relation.competitor) return;
    setEditingCompetitorId(relation.competitor.id);
    setEditedCompetitor({...relation.competitor});
  };
  
  const handleSaveCompetitorEdit = async () => {
    if (!editedCompetitor) return;
    
    const { error } = await supabase
      .from('products')
      .update({
        name: editedCompetitor.name,
        metadata: editedCompetitor.metadata
      })
      .eq('id', editedCompetitor.id);
    
    if (error) {
      console.error("Error updating competitor:", error);
      alert("Error updating competitor: " + error.message);
    } else {
      // Update the competitor in the local state
      setCompetitors(competitors.map(relation => {
        if (relation.competitor && relation.competitor.id === editedCompetitor.id) {
          return {
            ...relation,
            competitor: editedCompetitor
          };
        }
        return relation;
      }));
    }
    
    // Reset editing state
    setEditingCompetitorId(null);
    setEditedCompetitor(null);
  };
  
  const handleCompetitorChange = (field: string, value: string) => {
    if (!editedCompetitor) return;
    
    setEditedCompetitor({ 
      ...editedCompetitor, 
      [field]: value
    });
    };
  
  const handleCompetitorMetadataChange = (field: string, value: any) => {
    if (!editedCompetitor) return;
    
    setEditedCompetitor({ 
      ...editedCompetitor, 
      metadata: {
        ...editedCompetitor.metadata, 
        [field]: value 
      }
    });
  };

  const handleCancelCompetitorEdit = () => {
    setEditingCompetitorId(null);
    setEditedCompetitor(null);
  };

  // Product save and navigation handlers
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
      alert("Error updating product: " + error.message);
    }
    
    setIsSaving(false);
    setIsEditing(false);
    router.refresh();
  };
  
  const handleStartChat = () => {
    // Show loading state
    setIsStartingChat(true);
    
    // Navigate to chat page with the product ID
    setTimeout(() => {
      router.push(`/chat/new?productId=${params.productId}`);
    }, 200); // Small delay to allow loading state to be visible
  };

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
          <div className="p-6 pt-0">
            <Button onClick={() => router.push('/products')}>
              Return to Products
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 h-full overflow-y-auto">
      <Toaster position="top-right" />
      <ProductHeader
        product={product}
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={() => setIsEditing(true)}
        onSave={handleSaveProduct}
        onCancel={() => setIsEditing(false)}
        onStartChat={handleStartChat}
        isRefreshingReviews={isRefreshingReviews}
        isStartingChat={isStartingChat}
        onRefreshReviews={handleRefreshAllReviews}
        competitorCount={competitors.length}
        reviewCount={reviewCount}
        onInputChange={handleInputChange}
        onMetadataChange={handleMetadataChange}
        scrapingStatus={getScrapingStatus()}
        hideIndexForRag={true}
        showRefreshButton={false}
      />

      {/* Scraping Status Card */}
      {(hasRunningJobs || isRefreshingReviews) && (
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
          <CardContent className="pt-6 flex items-start md:items-center gap-4">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-medium text-blue-700 dark:text-blue-300 mb-1">
                Review scraping in progress
              </h3>
              <p className="text-blue-600 dark:text-blue-400 mb-2">
                We're gathering reviews for your product. This process typically takes 3-5 minutes to complete.
              </p>
              <div className="flex flex-col md:flex-row gap-2 md:gap-4 text-sm text-blue-500 dark:text-blue-400">
                <div className="flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2"></span>
                  Feel free to explore other sections
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2"></span>
                  You'll be notified when it's done
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2"></span>
                  Time for a coffee break! ☕
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            </CardHeader>
            <CardContent className="space-y-6">
              <ProductDetails
                product={product}
                isEditing={isEditing}
                onMetadataChange={handleMetadataChange}
              />
              
              <ProductResources
                resources={product.metadata.resources || []}
                isEditing={isEditing}
                onAddResource={handleAddResource}
                onRemoveResource={handleRemoveResource}
                onResourceChange={handleResourceChange}
              />
              
              <ProductCompetitors
                competitors={competitors}
                availableProducts={availableProducts}
                isEditing={isEditing}
                editingCompetitorId={editingCompetitorId}
                editedCompetitor={editedCompetitor}
                onAddCompetitor={handleAddCompetitor}
                onRemoveCompetitor={handleRemoveCompetitor}
                onEditCompetitor={handleEditCompetitor}
                onSaveCompetitorEdit={handleSaveCompetitorEdit}
                onCancelCompetitorEdit={handleCancelCompetitorEdit}
                onCompetitorChange={handleCompetitorChange}
                onCompetitorMetadataChange={handleCompetitorMetadataChange}
              />

              {/* <ProductImage 
                imageUrl={product.metadata.image_url} 
                onUpload={handleImageUpload} 
              /> */}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="insights" className="pb-6">
          <DefaultInsightsTab productName={product.name} />
        </TabsContent>
        
        <TabsContent value="chats" className="pb-6">
          <DefaultChatsTab 
            productId={params.productId}
            productName={product?.name || ""} 
            onStartChat={handleStartChat} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 