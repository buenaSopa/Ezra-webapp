"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";
import { getTrustpilotReviews } from "@/app/actions/trustpilot";
import { getAmazonReviews } from "@/app/actions/amazon";
import { refreshAllReviews } from "@/app/services/reviewService";
import { toast, Toaster } from "sonner";

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
      
      // Call the Trustpilot server action with product ID to store reviews in database
      const results = await getTrustpilotReviews(domain, params.productId);
      
      // Log the complete results to console
      console.log("Trustpilot Reviews Results:", results);
      
      if (results.success) {
        alert(`Successfully fetched and stored ${results.data?.length || 0} Trustpilot reviews. Check the console for details.`);
      } else {
        alert(`Error fetching Trustpilot reviews: ${results.error}`);
      }
    } catch (error) {
      console.error("Error calling Trustpilot API:", error);
      alert("Error calling Trustpilot API. Check console for details.");
    }
  };

  const handleTestAmazon = async () => {
    if (!product || !product.metadata.amazon_asin) {
      alert("Please add an Amazon ASIN first to test Amazon reviews");
      return;
    }
    
    try {
      // Ensure ASIN is trimmed
      const asin = product.metadata.amazon_asin.trim();
      
      // Update the product with trimmed ASIN if needed
      if (asin !== product.metadata.amazon_asin) {
        handleMetadataChange('amazon_asin', asin);
      }
      
      console.log("Testing Amazon review scraper for ASIN:", asin);
      
      // Call the Amazon reviews server action with product ID to get reviews
      const results = await getAmazonReviews(asin, params.productId);
      
      // Log the complete results to console
      console.log("Amazon Reviews Results:", results);
      
      if (results.success) {
        alert(`Successfully fetched ${results.data?.length || 0} Amazon reviews. Check the console for details.`);
      } else {
        alert(`Error fetching Amazon reviews: ${results.error}`);
      }
    } catch (error) {
      console.error("Error calling Amazon API:", error);
      alert("Error calling Amazon API. Check console for details.");
    }
  };

  // Image upload handler (placeholder)
  const handleImageUpload = () => {
    alert("Image upload functionality not implemented yet");
  };

  const handleRefreshAllReviews = async (includeCompetitors = false) => {
    if (!product) return;
    
    setIsRefreshingReviews(true);
    try {
      const results = await refreshAllReviews(params.productId, true, includeCompetitors);
      console.log("All reviews refresh results:", results);
      
      if (results.success) {
        if (results.fromCache) {
          // Format for Sonner toast
          toast.info(
            `Reviews were last refreshed on ${
              results.cacheDate ? new Date(results.cacheDate).toLocaleString() : 'unknown date'
            }`,
            { description: "Using cached reviews" }
          );
        } else {
          // Format a summary of what happened
          const sourcesText = results.sources.map(source => 
            `${source.name}: ${source.success ? 'Success' : 'Failed'}`
          ).join(', ');
          
          // If competitors were included, show additional information
          if (includeCompetitors && results.competitorResults && results.competitorResults.length > 0) {
            const successfulCompetitors = results.competitorResults.filter(c => c.success).length;
            const totalCompetitors = results.competitorResults.length;
            
            // Format for Sonner toast with competitor info
            toast.success(`Reviews refreshed for ${product.name} and ${successfulCompetitors}/${totalCompetitors} competitors`, {
              description: sourcesText
            });
          } else {
            // Format for Sonner toast - main product only
            toast.success("Successfully refreshed reviews", {
              description: sourcesText
            });
          }
        }
      } else {
        // Format for Sonner toast
        toast.error("Error refreshing reviews", {
          description: results.error || "An unknown error occurred"
        });
      }
    } catch (error) {
      console.error("Error refreshing reviews:", error);
      
      // Format for Sonner toast
      toast.error("Error refreshing reviews", {
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsRefreshingReviews(false);
    }
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
        onRefreshReviews={handleRefreshAllReviews}
        isRefreshingReviews={isRefreshingReviews}
        competitorCount={competitors.length}
        reviewCount={reviewCount}
        onInputChange={handleInputChange}
        onMetadataChange={handleMetadataChange}
      />

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
                onTestTrustpilot={handleTestTrustpilot}
                onTestAmazon={handleTestAmazon}
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