"use server";

import { createClient } from "@/app/utils/supabase/server";
import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";

// Define schema for the insights result
const insightsSchema = z.object({
  benefits: z.array(z.object({
    benefit: z.string().describe("A clear benefit that customers get from the product"),
    frequency: z.number().describe("Number indicating how frequently this benefit was mentioned"),
    examples: z.array(z.string().describe("Direct quotes from reviews mentioning this benefit"))
  })),
  painPoints: z.array(z.object({
    painPoint: z.string().describe("A pain point customers had before using the product"),
    examples: z.array(z.string().describe("Direct quotes from reviews mentioning this pain point"))
  })),
  valuedFeatures: z.array(z.object({
    feature: z.string().describe("A feature of the product that customers value"),
    examples: z.array(z.string().describe("Direct quotes from reviews mentioning this feature"))
  })),
  priorObjections: z.array(z.object({
    objection: z.string().describe("An objection customers had before purchasing"),
    examples: z.array(z.string().describe("Direct quotes from reviews mentioning this objection"))
  })),
  failedSolutions: z.array(z.object({
    solution: z.string().describe("A solution customers tried before that failed"),
    examples: z.array(z.string().describe("Direct quotes from reviews mentioning this failed solution"))
  })),
  emotionalTriggers: z.array(z.object({
    trigger: z.string().describe("An emotional trigger that drove purchase decisions"),
    examples: z.array(z.string().describe("Direct quotes from reviews showing this emotional trigger"))
  })),
  customerPersonas: z.array(z.object({
    name: z.string().describe("A descriptive name for this customer persona"),
    description: z.string().describe("Brief description of this customer persona"),
    needs: z.array(z.string().describe("Specific needs of this customer persona")),
    painPoints: z.array(z.string().describe("Specific pain points of this customer persona"))
  })),
  headlines: z.array(z.string().describe("Ready-to-use marketing headline")),
  competitivePositioning: z.array(z.object({
    angle: z.string().describe("A competitive positioning angle"),
    explanation: z.string().describe("Explanation of why this positioning would be effective")
  })),
  triggerEvents: z.array(z.string().describe("Events that trigger the need for this product")),
  objectionResponses: z.array(z.object({
    objection: z.string().describe("A common objection to purchasing"),
    response: z.string().describe("Effective response to overcome this objection")
  })),
  hooks: z.array(z.string().describe("One-liner hook for marketing copy"))
});

/**
 * Generates marketing insights for a product using AI SDK
 * @param productId The ID of the product to generate insights for
 * @param useCache If true, use cached insights when available (default: false - always generate new)
 */
export async function generateProductInsights(productId: string, useCache: boolean = false) {
  console.log(`Generating insights for product: ${productId}, useCache: ${useCache}`);
  
  try {
    const supabase = createClient();
    
    // Fetch product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();
    
    if (productError || !product) {
      throw new Error(`Product not found: ${productError?.message || "Unknown error"}`);
    }
    
    // Check if we should use cached insights when available
    if (useCache && product.metadata?.insights && product.metadata?.insights_generated_at) {
      const lastGenerated = new Date(product.metadata.insights_generated_at);
      const now = new Date();
      const hoursSinceGeneration = (now.getTime() - lastGenerated.getTime()) / (1000 * 60 * 60);
      
      // If insights were generated in the last 24 hours, return them
      if (hoursSinceGeneration < 24) {
        console.log(`Using existing insights from ${hoursSinceGeneration.toFixed(1)} hours ago`);
        return {
          success: true,
          insights: product.metadata.insights,
          cached: true
        };
      }
    }
    
    // Get product metadata for URL and ASIN matching
    const productUrl = product.metadata?.url;
    const amazonAsin = product.metadata?.amazon_asin;
    
    // Collect all reviews from different sources
    // Define a type for the reviews based on the review_sources table structure
    type ReviewSource = {
      id: string;
      product_source: string;
      source: string;
      source_id: string;
      review_text: string;
      review_title?: string;
      rating: number;
      review_date?: string;
      reviewer_name?: string;
      verified?: boolean;
      source_data?: any;
      created_at?: string;
    };
    
    let allReviews: ReviewSource[] = [];
    
    console.log("Fetching reviews from review_sources table...");
    console.time("fetch-reviews-time");
    
    // If we have a product URL, fetch Trustpilot reviews
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
        
        console.log(`Searching for Trustpilot reviews with domain: ${domain}`);
        const { data: trustpilotReviews, error: trustpilotError } = await supabase
          .from("review_sources")
          .select("*")
          .eq("product_source", domain)
          .eq("source", "trustpilot")
          .order("review_date", { ascending: false })
          .limit(300);
        
        if (trustpilotError) {
          console.error("Error fetching Trustpilot reviews:", trustpilotError);
        } else if (trustpilotReviews && trustpilotReviews.length > 0) {
          console.log(`Found ${trustpilotReviews.length} Trustpilot reviews`);
          allReviews = [...allReviews, ...trustpilotReviews];
        }
      } catch (error) {
        console.error("Error processing Trustpilot reviews:", error);
      }
    }
    
    // If we have an Amazon ASIN, fetch Amazon reviews
    if (amazonAsin) {
      try {
        console.log(`Searching for Amazon reviews with ASIN: ${amazonAsin}`);
        const { data: amazonReviews, error: amazonError } = await supabase
          .from("review_sources")
          .select("*")
          .eq("product_source", amazonAsin)
          .eq("source", "amazon")
          .order("review_date", { ascending: false })
          .limit(300);
        
        if (amazonError) {
          console.error("Error fetching Amazon reviews:", amazonError);
        } else if (amazonReviews && amazonReviews.length > 0) {
          console.log(`Found ${amazonReviews.length} Amazon reviews`);
          allReviews = [...allReviews, ...amazonReviews];
        }
      } catch (error) {
        console.error("Error processing Amazon reviews:", error);
      }
    }
    
    // Check if we have any reviews to analyze
    if (allReviews.length === 0) {
      throw new Error("No reviews found for this product. Check if the product has correct metadata (URL or ASIN).");
    }
    
    console.timeEnd("fetch-reviews-time");
    console.log(`Found ${allReviews.length} total reviews to analyze`);
    
    // Optimize the review selection to get a balanced sample across ratings
    console.log("Optimizing review selection...");
    
    // Group reviews by rating
    const reviewsByRating: { [key: number]: ReviewSource[] } = {};
    
    allReviews.forEach(review => {
      const rating = Math.round(review.rating); // Round to nearest integer
      if (!reviewsByRating[rating]) {
        reviewsByRating[rating] = [];
      }
      reviewsByRating[rating].push(review);
    });
    
    // Get a balanced sample across ratings
    const maxPerRating = 50; // Maximum reviews per rating
    const maxTotal = 250; // Maximum total reviews to process
    let selectedReviews: ReviewSource[] = [];
    
    // First ensure we have at least some reviews from each rating level
    for (let rating = 5; rating >= 1; rating--) {
      if (reviewsByRating[rating]) {
        // Prioritize the most recent reviews
        const ratingReviews = [...reviewsByRating[rating]]
          .sort((a, b) => {
            if (!a.review_date) return 1;
            if (!b.review_date) return -1;
            return new Date(b.review_date).getTime() - new Date(a.review_date).getTime();
          })
          .slice(0, maxPerRating);
          
        selectedReviews = [...selectedReviews, ...ratingReviews];
      }
    }
    
    // Trim to max total if needed
    if (selectedReviews.length > maxTotal) {
      console.log(`Limiting from ${selectedReviews.length} to ${maxTotal} reviews for better performance`);
      selectedReviews = selectedReviews.slice(0, maxTotal);
    }
    
    console.log(`Using ${selectedReviews.length} reviews for analysis (from ${allReviews.length} total)`);
    
    // Prepare review text for the prompt context
    const reviewsText = selectedReviews.map(review => {
      return `Review ID: ${review.id}
Rating: ${review.rating || 'N/A'} 
Title: ${review.review_title || 'No title'}
Content: ${review.review_text || 'No content'}
---`;
    }).join('\n\n');
    
    // Define the prompt for generating insights
    const prompt = `As an expert marketing analyst, analyze these product reviews and generate comprehensive marketing insights.

PRODUCT NAME: ${product.name}

REVIEWS:
${reviewsText}

Based on these reviews, generate structured marketing insights in these categories:
1. Benefits ranked by frequency (with example quotes)
2. Pain points customers had before (with example quotes)
3. Features they value most (with example quotes)
4. Prior objections they overcame (with example quotes)
5. Failed solutions they tried first (with example quotes)
6. Emotional triggers driving purchases (with example quotes)
7. 5 distinct customer personas
8. Ready-to-use static headlines
9. Competitive positioning angles
10. Specific trigger events
11. Responses to common objections
12. One-liners for hooks

Ensure all insights are data-driven and based on patterns found in the reviews.
For each insight that requires examples, include at least 2-3 direct quotes from reviews.`;
    
    // Use AI SDK's generateObject with timing
    console.log("Generating insights with AI SDK...");
    console.time("ai-sdk-generation-time");
    
    // Configure the OpenAI model
    const model = openai("gpt-4o-mini");
    
    const { object: insights } = await generateObject({
      model,
      schema: insightsSchema,
      schemaName: "ProductInsights",
      schemaDescription: "Structured marketing insights derived from product reviews",
      prompt,
      temperature: 0.3, // Slightly higher for more creative marketing insights
      maxTokens: 4000, // Set a reasonable token limit for the response
    });
    
    console.timeEnd("ai-sdk-generation-time");
    console.log("Successfully generated insights with AI SDK");
    
    // Store the insights
    const { error: insertError } = await supabase
      .from("products")
      .update({
        metadata: {
          ...product.metadata, // Preserve existing metadata
          insights,
          insights_generated_at: new Date().toISOString()
        }
      })
      .eq("id", productId);
    
    if (insertError) {
      console.error("Error storing insights in product metadata:", insertError);
    }
    
    return {
      success: true,
      insights,
      cached: false
    };
    
  } catch (error: any) {
    console.error("Error generating product insights:", error);
    return {
      success: false,
      error: error.message || "Unknown error occurred"
    };
  }
}

/**
 * Retrieves the latest generated insights for a product from its metadata
 */
export async function getProductInsights(productId: string) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from("products")
      .select("metadata")
      .eq("id", productId)
      .single();
    
    if (error) {
      throw new Error(`Error fetching product: ${error.message}`);
    }
    
    if (!data?.metadata?.insights) {
      return {
        success: false,
        error: "No insights found for this product"
      };
    }
    
    return {
      success: true,
      insights: data.metadata.insights,
      generatedAt: data.metadata.insights_generated_at
    };
    
  } catch (error: any) {
    console.error("Error in getProductInsights:", error);
    return {
      success: false,
      error: error.message || "Unknown error occurred"
    };
  }
} 