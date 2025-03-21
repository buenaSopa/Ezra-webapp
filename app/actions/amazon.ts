'use server';

import { ApifyClient } from 'apify-client';
import { revalidatePath } from 'next/cache';

// Function to get Amazon reviews via Apify
export async function getAmazonReviews(asin: string, productId: string) {
  try {
    console.log(`Fetching Amazon reviews for ASIN: ${asin} and product ID: ${productId}`);
    
    // Initialize the ApifyClient with API token
    // In production, use environment variables for the token
    const client = new ApifyClient({
      token: process.env.APIFY_API_TOKEN || 'your-api-token',
    });

    // Prepare Actor input
    const input = {
      "input": [
        {
          "asin": asin,
          "domainCode": "com",
          "sortBy": "recent",
          "maxPages": 1,
          "filterByStar": "all_stars", // Get all reviews
          "reviewerType": "all_reviews",
          "formatType": "current_format",
          "mediaType": "all_contents"
        }
      ]
    };

    // Run the Actor and wait for it to finish
    const run = await client.actor("ZebkvH3nVOrafqr5T").call(input);

    // Fetch results from the run's dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    console.log('Amazon review results:', JSON.stringify(items, null, 2));

    // Return the results
    return { 
      success: true, 
      data: items,
      error: null
    };
  } catch (error) {
    console.error('Error fetching Amazon reviews:', error);
    return { 
      success: false, 
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 