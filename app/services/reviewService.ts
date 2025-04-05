'use server'

import { createClient } from '@/app/utils/supabase/server';
import { startTrustpilotReviewScraping as fetchTrustpilotReviews } from '../actions/trustpilot';
import { getAmazonReviews as fetchAmazonReviews } from '../actions/amazon';

// Define return type for the service to include all possible fields
type ReviewServiceResult = {
  success: boolean;
  sources: Array<{
    name: string;
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }>;
  errors?: number;
  error?: string;
  message?: string;
  fromCache?: boolean;
  cacheDate?: string;
  competitorResults?: Array<{
    id: string;
    name: string;
    success: boolean;
    sources: Array<{name: string, success: boolean}>;
  }>;
};

// The core service that manages all review sources for a product and its competitors
export async function refreshAllReviews(
  productId: string, 
  forceRefresh = false,
  includeCompetitors = true,
  sources?: {
    trustpilot?: boolean;
    amazon?: boolean;
  }
): Promise<ReviewServiceResult> {
  const supabase = createClient();
  
  // Initialize result structure
  const results = {
    success: true,
    sources: [] as Array<{
      name: string;
      success: boolean;
      message: string;
      data?: any;
      error?: string;
    }>,
    competitorResults: [] as Array<{
      id: string;
      name: string;
      success: boolean;
      sources: Array<{name: string, success: boolean}>;
    }>,
    errors: 0,
    fromCache: false,
    cacheDate: undefined as string | undefined,
    message: undefined as string | undefined,
    error: undefined as string | undefined
  };
  
  // First, refresh the main product
  try {
    const mainProductResult = await refreshSingleProduct(productId, forceRefresh, sources);
    results.sources = mainProductResult.sources;
    results.errors = mainProductResult.errors;
    
    // If the main product had cache info, add it to results
    if (mainProductResult.fromCache) {
      results.fromCache = true;
      results.cacheDate = mainProductResult.cacheDate;
      results.message = mainProductResult.message;
    }
    
    // Overall success for main product
    results.success = results.errors < results.sources.length;
  } catch (error) {
    console.error("Error refreshing main product:", error);
    results.success = false;
    results.error = error instanceof Error ? error.message : "Unknown error";
    return results;
  }
  
  // Then handle competitors if requested
  if (includeCompetitors) {
    // Fetch the competitors
    const { data: relations, error } = await supabase
      .from("product_to_competitors")
      .select("*, competitor:competitor_product_id(*)")
      .eq("product_id", productId);
      
    if (!error && relations?.length > 0) {
      console.log(`Processing ${relations.length} competitors for product ${productId}`);
      
      // Process each competitor
      for (const relation of relations) {
        const competitor = relation.competitor;
        if (!competitor) continue;
        
        try {
          const competitorResult = await refreshSingleProduct(
            competitor.id, 
            forceRefresh,
            sources
          );
          
          results.competitorResults.push({
            id: competitor.id,
            name: competitor.name,
            success: competitorResult.sources.some(s => s.success),
            sources: competitorResult.sources.map(s => ({
              name: s.name,
              success: s.success
            }))
          });
          
          console.log(`Successfully processed competitor: ${competitor.name}`);
        } catch (error) {
          console.error(`Error refreshing competitor ${competitor.name}:`, error);
          results.competitorResults.push({
            id: competitor.id,
            name: competitor.name || `Competitor ID: ${competitor.id}`,
            success: false,
            sources: []
          });
        }
      }
    } else if (error) {
      console.error("Error fetching competitors:", error);
    } else {
      console.log(`No competitors found for product ${productId}`);
    }
  }
  
  return results;
}

// Helper function that processes a single product
async function refreshSingleProduct(
  productId: string, 
  forceRefresh = false,
  sources?: {
    trustpilot?: boolean;
    amazon?: boolean;
  }
): Promise<{
  sources: Array<{
    name: string;
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }>;
  errors: number;
  fromCache?: boolean;
  cacheDate?: string;
  message?: string;
}> {
  const results = {
    sources: [] as Array<{
      name: string;
      success: boolean;
      message: string;
      data?: any;
      error?: string;
    }>,
    errors: 0
  };

  const supabase = createClient();
  
  // Get product data
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();
  
  if (productError || !product) {
    return {
      sources: [{
        name: 'database',
        success: false,
        message: productError?.message || 'Product not found',
        error: productError?.message || 'Product not found'
      }],
      errors: 1
    };
  }

  // Check if we need a refresh based on last_reviews_scraped_at
  let needsRefresh = forceRefresh;
  if (!forceRefresh && product.last_reviews_scraped_at) {
    const lastScraped = new Date(product.last_reviews_scraped_at);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    needsRefresh = lastScraped < oneWeekAgo;
  }

  if (!needsRefresh) {
    return {
      sources: [],
      errors: 0,
      fromCache: true,
      message: 'Using cached reviews (less than a week old)',
      cacheDate: product.last_reviews_scraped_at
    };
  }

  // Define scraping tasks (we'll trigger these, not wait for them)
  const scrapingTasks = [];

  // 1. Trustpilot Scraper (if product has a URL and trustpilot source is not disabled)
  if (product.metadata?.url && (!sources || sources.trustpilot !== false)) {
    try {
      const trustpilotResult = await fetchTrustpilotReviews(product.metadata.url, productId);
      results.sources.push({
        name: 'trustpilot',
        success: trustpilotResult.success,
        message: trustpilotResult.success 
          ? 'Trustpilot review scraping initiated' 
          : 'Failed to initiate Trustpilot review scraping',
        data: trustpilotResult,
        error: trustpilotResult.error
      });
      
      if (!trustpilotResult.success) {
        results.errors++;
      }
    } catch (error) {
      console.error('Error triggering Trustpilot review scraping:', error);
      results.sources.push({
        name: 'trustpilot',
        success: false,
        message: 'Failed to initiate Trustpilot review scraping',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      results.errors++;
    }
  }

  // 2. Amazon Scraper (if product has an ASIN and amazon source is not disabled)
  if (product.metadata?.amazon_asin && (!sources || sources.amazon !== false)) {
    try {
      // Ensure the ASIN is trimmed to handle any accidental spaces
      const asin = product.metadata.amazon_asin.trim();
      
      // Trigger Amazon scraping without awaiting full completion
      const amazonResult = await fetchAmazonReviews(asin, productId, 500);
      
      results.sources.push({
        name: 'amazon',
        success: amazonResult.success,
        message: amazonResult.success 
          ? 'Amazon review scraping initiated' 
          : 'Failed to initiate Amazon review scraping',
        data: amazonResult,
        error: amazonResult.error
      });
      
      if (!amazonResult.success) {
        results.errors++;
      }
    } catch (error) {
      console.error('Error triggering Amazon review scraping:', error);
      results.sources.push({
        name: 'amazon',
        success: false,
        message: 'Failed to initiate Amazon review scraping',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      results.errors++;
    }
  }

  // If no valid sources for this product, return early
  if (results.sources.length === 0) {
    return {
      sources: [{
        name: 'configuration',
        success: false,
        message: 'No review sources configured for this product',
        error: 'Missing URL or ASIN'
      }],
      errors: 1
    };
  }

  // Update the product's last_reviews_scraped_at timestamp if any source succeeded
  if (results.errors < results.sources.length) {
    await supabase
      .from('products')
      .update({ last_reviews_scraped_at: new Date().toISOString() })
      .eq('id', productId);
  }
  
  return results;
}