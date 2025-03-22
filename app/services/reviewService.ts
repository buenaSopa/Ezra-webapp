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
};

// The core service that manages all review sources
export async function refreshAllReviews(productId: string, forceRefresh = false): Promise<ReviewServiceResult> {
  const results = {
    success: true,
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
      success: false,
      error: productError?.message || 'Product not found',
      sources: []
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
      success: true,
      message: 'Using cached reviews (less than a week old)',
      sources: [],
      fromCache: true,
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
    scrapingTasks.push(runScraper('amazon', async () => {
      // Use a higher max reviews value to get more comprehensive results
      return await fetchAmazonReviews(product.metadata.amazon_asin, productId, 10);
    }));
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

  // Overall success is true if at least one source succeeded
  results.success = results.errors < scrapingTasks.length;
  
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
