'use server'

import { createClient } from '@/app/utils/supabase/server';
import { getTrustpilotReviews as fetchTrustpilotReviews } from '../actions/trustpilot';
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
  includeCompetitors = true
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
    const mainProductResult = await refreshSingleProduct(productId, forceRefresh);
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
            forceRefresh
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
  forceRefresh = false
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

  // Run scrapers in parallel for efficiency
  const scrapingTasks = [];

  // 1. Trustpilot Scraper (if product has a URL)
  if (product.metadata?.url) {
    scrapingTasks.push(runScraper('trustpilot', async () => {
      return await fetchTrustpilotReviews(product.metadata.url, productId, true, forceRefresh);
    }));
  }

  // 2. Amazon Scraper (if product has an ASIN)
  if (product.metadata?.amazon_asin) {
    // Ensure the ASIN is trimmed to handle any accidental spaces
    const asin = product.metadata.amazon_asin.trim();
    // Use a higher max reviews value to get more comprehensive results
    scrapingTasks.push(runScraper('amazon', async () => {
      return await fetchAmazonReviews(asin, productId, 10);
    }));
  }

  // If no valid sources for this product, return early
  if (scrapingTasks.length === 0) {
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

  // Wait for all scrapers to complete (even if some fail)
  const sourceResults = await Promise.allSettled(scrapingTasks);
  
  // Process results
  sourceResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results.sources.push(result.value);
      if (!result.value.success) {
        results.errors++;
      }
    } else {
      // Add error for rejected promises
      results.sources.push({
        name: `source-${index}`, // Fallback name if we can't determine the source
        success: false,
        message: 'Scraper failed',
        error: result.reason?.toString() || 'Unknown error'
      });
      results.errors++;
    }
  });

  // Update the overall last_reviews_scraped_at if any source succeeded
  if (results.errors < scrapingTasks.length) {
    await supabase
      .from('products')
      .update({ last_reviews_scraped_at: new Date().toISOString() })
      .eq('id', productId);
  }
  
  return results;
}

// Helper to run a scraper with error handling
async function runScraper(name: string, scraperFn: () => Promise<any>) {
  try {
    const result = await scraperFn();
    return {
      name,
      success: result.success,
      message: result.success ? 'Successfully scraped reviews' : 'Failed to scrape reviews',
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error(`Error running ${name} scraper:`, error);
    return {
      name,
      success: false,
      message: 'Scraper encountered an error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 
