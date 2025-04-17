"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";
import { startTrustpilotReviewScraping } from "@/app/actions/trustpilot";
import { getAmazonReviews } from "@/app/actions/amazon";
import { refreshAllReviews } from "@/app/services/reviewService";
import { toast, Toaster } from "sonner";
import useSWR from 'swr';
import { getScrapingJobsForProduct } from '@/app/actions/scraping-jobs';
import { createCompetitor } from '@/app/actions/products';

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
  const [productResources, setProductResources] = useState<any[]>([]);
  const [competitors, setCompetitors] = useState<ProductCompetitor[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [editingCompetitorId, setEditingCompetitorId] = useState<string | null>(null);
  const [editedCompetitor, setEditedCompetitor] = useState<Product | null>(null);
  const [reviewSourcesFound, setReviewSourcesFound] = useState<{
    trustpilot: boolean; 
    amazon: boolean;
    hasAny: boolean;
  }>({ trustpilot: false, amazon: false, hasAny: false });
  const [hasRunningJobs, setHasRunningJobs] = useState<boolean>(false);
  const [isStartingChat, setIsStartingChat] = useState<boolean>(false);
  // Track original URL and ASIN for detecting changes
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [originalAsin, setOriginalAsin] = useState<string>('');
  const [isScrapingCardExpanded, setIsScrapingCardExpanded] = useState(false);
  
  // Helper function to check if reviews already exist for this product
  const checkExistingReviews = async (product: Product) => {
    if (!product) return false;
    
    try {
      const productUrl = product.metadata?.url;
      const amazonAsin = product.metadata?.amazon_asin;
      let hasReviews = false;
      
      // Check for Trustpilot reviews if URL exists
      if (productUrl) {
        // Extract domain from URL for Trustpilot matching
        let domain = productUrl;
        
        const { count: trustpilotCount, error: trustpilotError } = await supabase
          .from("review_sources")
          .select("*", { count: 'exact', head: true })
          .eq("product_source", domain)
          .eq("source", "trustpilot");
        
        if (!trustpilotError && trustpilotCount && trustpilotCount > 0) {
          console.log(`Found ${trustpilotCount} existing Trustpilot reviews for domain ${domain}`);
          hasReviews = true;
        }
      }
      
      // Check for Amazon reviews if ASIN exists
      if (!hasReviews && amazonAsin) {
        const { count: amazonCount, error: amazonError } = await supabase
          .from("review_sources")
          .select("*", { count: 'exact', head: true })
          .eq("product_source", amazonAsin)
          .eq("source", "amazon");
        
        if (!amazonError && amazonCount && amazonCount > 0) {
          console.log(`Found ${amazonCount} existing Amazon reviews for ASIN ${amazonAsin}`);
          hasReviews = true;
        }
      }
      
      // Check for direct reviews
      const { count: directCount, error: directError } = await supabase
        .from("reviews")
        .select("*", { count: 'exact', head: true })
        .eq("product_id", params.productId);
      
      if (!directError && directCount && directCount > 0) {
        console.log(`Found ${directCount} existing direct reviews for product ${params.productId}`);
        hasReviews = true;
      }
      
      return hasReviews;
    } catch (error) {
      console.error("Error checking for existing reviews:", error);
      return false; // Default to false to allow scraping if check fails
    }
  };

  // Check for reviews for a specific source (Trustpilot domain or Amazon ASIN)
  const checkExistingSourceReviews = async (source: string, sourceType: 'trustpilot' | 'amazon') => {
    try {
      // For Trustpilot, extract domain from URL
      let sourceValue = source;
      
      const { count, error } = await supabase
        .from("review_sources")
        .select("*", { count: 'exact', head: true })
        .eq("product_source", sourceValue)
        .eq("source", sourceType);
      
      if (error) {
        console.error(`Error checking for ${sourceType} reviews:`, error);
        return false;
      }
      
      return count && count > 0;
    } catch (error) {
      console.error(`Error in checkExistingSourceReviews for ${sourceType}:`, error);
      return false;
    }
  };

  // Check and scrape only for new sources
  const checkAndScrapeFreshSources = async (product: Product) => {
    if (!product) return;

    const newUrl = product.metadata?.url || '';
    const newAsin = product.metadata?.amazon_asin || '';
    let needsScraping = false;
    let scrapeSources: { trustpilot: boolean, amazon: boolean } = { trustpilot: false, amazon: false };
    
    // Check if URL changed and if new URL has reviews
    if (newUrl && newUrl !== originalUrl) {
      const hasTrustpilotReviews = await checkExistingSourceReviews(newUrl, 'trustpilot');
      if (!hasTrustpilotReviews) {
        console.log(`URL changed from ${originalUrl} to ${newUrl}, needs Trustpilot scraping`);
        needsScraping = true;
        scrapeSources.trustpilot = true;
      } else {
        console.log(`URL changed but Trustpilot reviews already exist for ${newUrl}`);
      }
    }
    
    // Check if ASIN changed and if new ASIN has reviews
    if (newAsin && newAsin !== originalAsin) {
      const hasAmazonReviews = await checkExistingSourceReviews(newAsin, 'amazon');
      if (!hasAmazonReviews) {
        console.log(`ASIN changed from ${originalAsin} to ${newAsin}, needs Amazon scraping`);
        needsScraping = true;
        scrapeSources.amazon = true;
      } else {
        console.log(`ASIN changed but Amazon reviews already exist for ${newAsin}`);
      }
    }
    
    // If either source needs scraping, initiate targeted scraping
    if (needsScraping) {
      setIsRefreshingReviews(true);
      try {
        // Pass the specific sources to scrape to refreshAllReviews
        console.log(`Initiating selective scraping for: ${JSON.stringify(scrapeSources)}`);
        const results = await refreshAllReviews(
          params.productId, 
          true, // Force refresh
          false, // Don't include competitors
          {
            trustpilot: scrapeSources.trustpilot ? true : false,
            amazon: scrapeSources.amazon ? true : false
          }
        );
        
        if (!results.success) {
          toast.error("Error initiating selective review scraping", {
            description: results.error || "An unknown error occurred"
          });
        } else {
          let sourceDescription = '';
          if (scrapeSources.trustpilot && scrapeSources.amazon) {
            sourceDescription = 'website and Amazon';
          } else if (scrapeSources.trustpilot) {
            sourceDescription = 'website';
          } else if (scrapeSources.amazon) {
            sourceDescription = 'Amazon';
          }
          
          toast.success("Scraping new review sources", {
            description: `Started scraping for ${sourceDescription} reviews.`
          });
        }
      } catch (error) {
        console.error("Error in selective scraping:", error);
        toast.error("Error initiating selective review scraping", {
          description: error instanceof Error ? error.message : "An unknown error occurred"
        });
      } finally {
        setIsRefreshingReviews(false);
      }
    } else {
      console.log("No new sources to scrape");
    }
    
    // Update the tracking variables
    setOriginalUrl(newUrl);
    setOriginalAsin(newAsin);
  };
  
  // Define the handleRefreshAllReviews function with useCallback
  const handleRefreshAllReviews = useCallback(async (includeCompetitors = false, skipToast = false) => {
    if (!product) return;
    
    // First check if reviews already exist for this product
    const hasExistingReviews = await checkExistingReviews(product);
    
    if (hasExistingReviews) {
      console.log("Skipping review scraping - reviews already exist for this product");
      
      if (!skipToast) {
        toast.info("Reviews already exist", {
          description: "This product already has reviews. No need to scrape again."
        });
      }
      
      return;
    }
    
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
  
  // Fetch competitor product IDs
  const competitorIds = competitors.map(comp => comp.competitor_product_id);
  
  // Use SWR to fetch competitor scraping job status and refresh automatically
  const { data: competitorScrapingData } = useSWR(
    ['competitor-scraping-jobs', params.productId, competitorIds.join(',')],
    async () => {
      if (!competitorIds.length) return { jobs: [] };
      
      const allJobs = [];
      
      // Fetch jobs for each competitor
      for (const competitorId of competitorIds) {
        try {
          const result = await getScrapingJobsForProduct(competitorId);
          if (result.success && result.jobs && result.jobs.length > 0) {
            // Add product information to each job
            const competitorInfo = competitors.find(c => c.competitor_product_id === competitorId);
            const productName = competitorInfo?.competitor?.name || 'Unknown competitor';
            
            const enrichedJobs = result.jobs.map(job => ({
              ...job,
              productName,
              isCompetitor: true,
              competitorId
            }));
            
            allJobs.push(...enrichedJobs);
          }
        } catch (error) {
          console.error(`Error fetching scraping jobs for competitor ${competitorId}:`, error);
        }
      }
      
      return { jobs: allJobs };
    },
    { refreshInterval: 5000 } // Refresh every 5 seconds
  );
  
  // Combine main product jobs with competitor jobs
  const allScrapingJobs = useMemo(() => {
    const mainJobs = scrapingData?.jobs || [];
    const competitorJobs = competitorScrapingData?.jobs || [];
    
    return [
      ...mainJobs.map(job => ({ 
        ...job, 
        productName: product?.name || 'Current product',
        isCompetitor: false
      })),
      ...competitorJobs
    ];
  }, [scrapingData?.jobs, competitorScrapingData?.jobs, product?.name]);
  
  // Update hasRunningJobs state when scraping data changes
  useEffect(() => {
    // Check if there are any running jobs in either main product or competitors
    const hasRunning = 
      (scrapingData?.jobs?.some(job => 
        job.status === 'running' || job.status === 'indexing' || job.status === 'queued'
      ) || false) ||
      (competitorScrapingData?.jobs?.some(job => 
        job.status === 'running' || job.status === 'indexing' || job.status === 'queued'
      ) || false);
    
    setHasRunningJobs(hasRunning);
  }, [scrapingData, competitorScrapingData]);
  
  // Determine the overall scraping status
  const getScrapingStatus = () => {
    if (!scrapingData || !scrapingData.jobs || scrapingData.jobs.length === 0) {
      return {
        text: 'Ready',
        color: 'text-green-500',
        isReady: true
      };
    }
    
    // Define status priority (lower number = higher priority to show)
    const statusPriority: Record<string, number> = {
      'queued': 1,
      'running': 2,
      'indexing': 3,
      'indexed': 4,
      'completed': 5,
      'failed': 6,
      'index_failed': 7
    };
    
    // Find the job with the highest priority (lowest stage in the process)
    const activeJobs = scrapingData.jobs.filter(job => 
      ['queued', 'running', 'indexing'].includes(job.status)
    );
    
    if (activeJobs.length > 0) {
      // Sort by priority and take the one with the highest priority (lowest number)
      activeJobs.sort((a, b) => statusPriority[a.status as keyof typeof statusPriority] - statusPriority[b.status as keyof typeof statusPriority]);
      const highestPriorityJob = activeJobs[0];
      
      if (highestPriorityJob.status === 'queued' || highestPriorityJob.status === 'running') {
        return {
          text: 'Processing reviews...',
          color: 'text-blue-500',
          isReady: true // Always allow chat to start
        };
      } else if (highestPriorityJob.status === 'indexing') {
        return {
          text: 'Vectorizing reviews...',
          color: 'text-blue-500',
          isReady: true // Always allow chat to start
        };
      }
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
        text: 'Some review scraping failed',
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
        
        // Store original URL and ASIN values for change detection
        setOriginalUrl(data.metadata?.url || '');
        setOriginalAsin(data.metadata?.amazon_asin || '');
        
        // Check if this is a newly created product without reviews
        if (!data.last_reviews_scraped_at && 
            (data.metadata?.url || data.metadata?.amazon_asin) && 
            !isRefreshingReviews) {
          
          // Check if reviews already exist for this product
          const hasExistingReviews = await checkExistingReviews(data);
          
          if (!hasExistingReviews) {
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
          } else {
            console.log("Skipping auto-scraping - reviews already exist for this product");
            
            // Update the last_reviews_scraped_at field to avoid future auto-triggers
            const { error: updateError } = await supabase
              .from("products")
              .update({ last_reviews_scraped_at: new Date().toISOString() })
              .eq("id", params.productId);
            
            if (updateError) {
              console.error("Error updating last_reviews_scraped_at:", updateError);
            }
          }
        }
      }
      
      setIsLoading(false);
    };
    
    fetchProduct();
  }, [params.productId, supabase, isRefreshingReviews]);
  
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
  
  // Add effect to fetch product resources from the product_marketing_resources table
  useEffect(() => {
    const fetchProductResources = async () => {
      if (!params.productId) return;
      
      try {
        const { data, error } = await supabase
          .from("product_marketing_resources")
          .select("*")
          .eq("product_id", params.productId)
          .order("created_at", { ascending: false });
        
        if (error) {
          console.error("Error fetching product resources:", error);
          return;
        }
        
        // Map the database resources to the format expected by the ProductResources component
        const formattedResources = data.map(resource => ({
          name: resource.title,
          url: resource.url || resource.file_path ? 
            supabase.storage.from('marketing-resources').getPublicUrl(resource.file_path).data.publicUrl : 
            '',
          id: resource.id,
          description: resource.description,
          resourceType: resource.resource_type,
          isFile: !!resource.file_path
        }));
        
        setProductResources(formattedResources);
        console.log("Loaded product resources:", formattedResources);
      } catch (err) {
        console.error("Error in fetchProductResources:", err);
      }
    };
    
    fetchProductResources();
  }, [params.productId, supabase]);
  
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
  const handleAddResource = async () => {
    if (!product) return;
    
    try {
      // Add new resource to product_marketing_resources table
      const { data, error } = await supabase
        .from("product_marketing_resources")
        .insert({
          product_id: params.productId,
          resource_type: 'link',
          title: "New Resource",
          url: ""
        })
        .select();
      
      if (error) {
        console.error("Error adding resource:", error);
        return;
      }
      
      // Update the state with the new resource
      setProductResources([
        ...productResources, 
        {
          name: "New Resource",
          url: "",
          id: data[0].id,
          resourceType: 'link',
          isFile: false
        }
      ]);
    } catch (err) {
      console.error("Error in handleAddResource:", err);
    }
  };
  
  const handleRemoveResource = async (index: number) => {
    try {
      const resourceToRemove = productResources[index];
      
      // Delete from database
      const { error } = await supabase
        .from("product_marketing_resources")
        .delete()
        .eq("id", resourceToRemove.id);
      
      if (error) {
        console.error("Error removing resource:", error);
        return;
      }
      
      // Update state
      const updatedResources = [...productResources];
      updatedResources.splice(index, 1);
      setProductResources(updatedResources);
    } catch (err) {
      console.error("Error in handleRemoveResource:", err);
    }
  };
  
  const handleResourceChange = async (index: number, field: string, value: string) => {
    try {
      const resourceToUpdate = productResources[index];
      const mappedField = field === 'name' ? 'title' : field;
      
      // Update in database
      const { error } = await supabase
        .from("product_marketing_resources")
        .update({ [mappedField]: value })
        .eq("id", resourceToUpdate.id);
      
      if (error) {
        console.error(`Error updating resource ${field}:`, error);
        return;
      }
      
      // Update state
      const updatedResources = [...productResources];
      updatedResources[index] = {
        ...updatedResources[index],
        [field]: value
      };
      setProductResources(updatedResources);
    } catch (err) {
      console.error("Error in handleResourceChange:", err);
    }
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

  // New function to create a competitor
  const handleCreateNewCompetitor = async (competitor: { 
    name: string, 
    url?: string, 
    amazonAsin?: string, 
    description?: string 
  }) => {
    if (!product) return;
    
    try {
      const result = await createCompetitor({
        productId: params.productId,
        name: competitor.name,
        url: competitor.url,
        amazonAsin: competitor.amazonAsin,
        description: competitor.description
      });
      
      if (!result.success) {
        toast.error("Failed to create competitor", {
          description: result.error
        });
        throw new Error(result.error);
      }
      
      toast.success("Competitor created successfully", {
        description: "The competitor has been added to your product."
      });
      
      // Refresh the competitors list
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
      
    } catch (error) {
      console.error("Error in handleCreateNewCompetitor:", error);
      throw error; // Re-throw to handle in the component
    }
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
      setIsSaving(false);
      return;
    }
    
    setIsSaving(false);
    setIsEditing(false);
    
    // After successful save, check for URL or ASIN changes and trigger scraping if needed
    await checkAndScrapeFreshSources(product);
    
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

  // Function to check if reviews exist for product sources
  const checkReviewSources = async (product: Product) => {
    if (!product) return { trustpilot: false, amazon: false, hasAny: false };
    
    try {
      let hasTrustpilotReviews = false;
      let hasAmazonReviews = false;
      
      // Get product metadata for URL and ASIN
      const productUrl = product.metadata?.url;
      const amazonAsin = product.metadata?.amazon_asin;
      
      // Check for Trustpilot reviews if URL exists
      if (productUrl) {
        try {
          // Extract domain from URL for Trustpilot matching
          let domain = productUrl;
          
          const { count, error } = await supabase
            .from("review_sources")
            .select("*", { count: 'exact', head: true })
            .eq("product_source", domain)
            .eq("source", "trustpilot");
          
          if (!error && count && count > 0) {
            hasTrustpilotReviews = true;
            console.log(`Found Trustpilot reviews for domain ${domain}`);
          }
        } catch (error) {
          console.error("Error checking Trustpilot reviews:", error);
        }
      }
      
      // Check for Amazon reviews if ASIN exists
      if (amazonAsin) {
        try {
          const { count, error } = await supabase
            .from("review_sources")
            .select("*", { count: 'exact', head: true })
            .eq("product_source", amazonAsin)
            .eq("source", "amazon");
          
          if (!error && count && count > 0) {
            hasAmazonReviews = true;
            console.log(`Found Amazon reviews for ASIN ${amazonAsin}`);
          }
        } catch (error) {
          console.error("Error checking Amazon reviews:", error);
        }
      }
      
      console.log("hasTrustpilotReviews", hasTrustpilotReviews);
      console.log("hasAmazonReviews", hasAmazonReviews);
      
      const hasAny = hasTrustpilotReviews || hasAmazonReviews;
      return { trustpilot: hasTrustpilotReviews, amazon: hasAmazonReviews, hasAny };
    } catch (error) {
      console.error("Error checking review sources:", error);
      return { trustpilot: false, amazon: false, hasAny: false };
    }
  };

  // Use effect to check for review sources when product is loaded
  useEffect(() => {
    const checkSources = async () => {
      if (product) {
        const sources = await checkReviewSources(product);
        setReviewSourcesFound(sources);
      }
    };
    
    checkSources();
  }, [product, scrapingData]); // Include scrapingData to refresh when scraping status changes

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
    <div className="container max-w-6xl mx-auto p-6 h-full overflow-y-auto ">
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
        reviewSourcesFound={reviewSourcesFound}
        onInputChange={handleInputChange}
        onMetadataChange={handleMetadataChange}
        scrapingStatus={getScrapingStatus()}
        hideIndexForRag={true}
        showRefreshButton={false}
      />

      {/* Scraping Status Card - Smaller, more compact collapsible */}
      <Card className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
        <CardContent className="py-3">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => setIsScrapingCardExpanded(!isScrapingCardExpanded)}
          >
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full flex items-center justify-center" 
                  style={{backgroundColor: hasRunningJobs ? '#EFF6FF' : '#ECFDF5'}}>
                {(hasRunningJobs || isRefreshingReviews) ? (
                  <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <div className="h-4 w-4 text-green-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-grow">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium mb-0.5"
                      style={{color: hasRunningJobs ? '#1E40AF' : '#047857'}}>
                    {(hasRunningJobs || isRefreshingReviews) ? 'Review scraping in progress (10 mins)' : 'Review scraping complete'}
                  </h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {(hasRunningJobs || isRefreshingReviews) ? (
                      <>Don't start a new chat yet - processing {allScrapingJobs.length} job{allScrapingJobs.length !== 1 ? 's' : ''}.</>
                    ) : (
                      <>All review scraping jobs have completed.</>
                    )}
                  </p>
                </div>
                <button 
                  className="text-blue-500 p-1 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsScrapingCardExpanded(!isScrapingCardExpanded);
                  }}
                >
                  {isScrapingCardExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>
          </div>
            
          {/* Expandable content */}
          {isScrapingCardExpanded && (
            <div className="mt-3 border-t border-blue-200 pt-3">
              {/* Job Status Details */}
              {allScrapingJobs.length > 0 && (
                <div className="border border-blue-200 rounded-md overflow-hidden mb-3">
                  <div className="bg-blue-100 dark:bg-blue-900/50 px-3 py-1 text-blue-700 dark:text-blue-300 text-xs font-medium">
                    {(hasRunningJobs || isRefreshingReviews) ? 'Current Scraping Jobs' : 'Previous Scraping Jobs'}
                  </div>
                  <div className="divide-y divide-blue-200">
                    {allScrapingJobs.map((job, index) => (
                      <div key={job.id || index} className="px-3 py-2 flex justify-between items-center">
                        <div>
                          <div className="font-medium text-xs flex items-center">
                            {job.isCompetitor && (
                              <span className="text-xs px-1 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded mr-1">
                                Competitor
                              </span>
                            )}
                            {job.productName || 'Unknown product'}
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <span className="rounded-full px-1 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-[10px]">
                              {job.source || 'Unknown source'}
                            </span>
                            <span className="truncate max-w-[150px]">{job.source_identifier || 'Unknown identifier'}</span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {job.status === 'queued' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800">
                              <span className="h-1.5 w-1.5 mr-1 rounded-full bg-yellow-400"></span>
                              Queued
                            </span>
                          )}
                          {job.status === 'running' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
                              <span className="h-1.5 w-1.5 mr-1 rounded-full bg-blue-400 animate-pulse"></span>
                              Processing
                            </span>
                          )}
                          {job.status === 'indexing' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-800">
                              <span className="h-1.5 w-1.5 mr-1 rounded-full bg-indigo-400 animate-pulse"></span>
                              Vectorizing
                            </span>
                          )}
                          {job.status === 'indexed' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                              <span className="h-1.5 w-1.5 mr-1 rounded-full bg-green-400"></span>
                              Complete
                            </span>
                          )}
                          {job.status === 'failed' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800">
                              <span className="h-1.5 w-1.5 mr-1 rounded-full bg-red-400"></span>
                              Failed
                            </span>
                          )}
                          {(job.status === 'completed' || !job.status) && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-800">
                              <span className="h-1.5 w-1.5 mr-1 rounded-full bg-gray-400"></span>
                              No Reviews Found
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 text-xs text-blue-500 dark:text-blue-400">
                {(hasRunningJobs || isRefreshingReviews) ? (
                  <>
                    <div className="flex items-center">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-1"></span>
                      Data collection (8 mins)
                    </div>
                    <div className="flex items-center">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-1"></span>
                      Vectorization (2 mins)
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1"></span>
                      Data collection complete
                    </div>
                    <div className="flex items-center">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1"></span>
                      Ready for chat
                    </div>
                  </>
                )}
              </div>
              
              {/* Review sources found section */}
              {!isRefreshingReviews && !hasRunningJobs && reviewSourcesFound && (
                <div className="mt-3 border-t border-blue-200 pt-3">
                  <h4 className="text-xs font-medium text-blue-700 mb-2">Reviews found for:</h4>
                  <div className="flex flex-wrap gap-2">
                    {reviewSourcesFound.trustpilot && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                        <span className="h-1.5 w-1.5 mr-1 rounded-full bg-green-500"></span>
                        Trustpilot Reviews
                      </span>
                    )}
                    {reviewSourcesFound.amazon && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                        <span className="h-1.5 w-1.5 mr-1 rounded-full bg-green-500"></span>
                        Amazon Reviews
                      </span>
                    )}
                    {!reviewSourcesFound.hasAny && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                        <span className="h-1.5 w-1.5 mr-1 rounded-full bg-gray-400"></span>
                        No reviews found yet
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
                resources={productResources}
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
                onCreateNewCompetitor={handleCreateNewCompetitor}
              />

              {/* <ProductImage 
                imageUrl={product.metadata.image_url} 
                onUpload={handleImageUpload} 
              /> */}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="insights" className="pb-6">
          <DefaultInsightsTab productName={product.name} productId={params.productId} />
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