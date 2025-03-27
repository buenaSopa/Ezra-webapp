"use server";

import { createClient } from "@/app/utils/supabase/server";
import { indexProductReviews, Review } from "@/lib/reviews-indexer";
import { revalidatePath } from "next/cache";

export async function indexProductReviewsAction(productId: string) {
  try {
    console.log(`Indexing reviews for product ${productId}`);
    const supabase = createClient();
    
    // First, get the product name and metadata
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, metadata")
      .eq("id", productId)
      .single();
    
    if (productError || !product) {
      console.error("Error fetching product:", productError);
      return { 
        success: false, 
        error: productError?.message || "Product not found" 
      };
    }
    
    // Store all reviews we'll index
    const allReviews: Review[] = [];
    
    // Get product URL and ASIN from metadata
    const productUrl = product.metadata?.url;
    const amazonAsin = product.metadata?.amazon_asin;
    
    // Fetch Trustpilot reviews if URL exists
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
        
        const { data: trustpilotReviews, error: trustpilotError } = await supabase
          .from("review_sources")
          .select("id, source, review_text, rating, review_date, created_at")
          .eq("product_source", domain)
          .eq("source", "trustpilot");
        
        if (trustpilotError) {
          console.error("Error fetching Trustpilot reviews:", trustpilotError);
        } else if (trustpilotReviews && trustpilotReviews.length > 0) {
          // Format Trustpilot reviews for indexing
          const formattedTrustpilotReviews: Review[] = trustpilotReviews.map(review => ({
            id: review.id,
            productId: productId,
            text: review.review_text,
            rating: review.rating,
            source: review.source,
            date: review.review_date || review.created_at,
          }));
          
          allReviews.push(...formattedTrustpilotReviews);
        }
      } catch (error) {
        console.error("Error processing Trustpilot reviews:", error);
      }
    }
    
    // Fetch Amazon reviews if ASIN exists
    if (amazonAsin) {
      try {
        const { data: amazonReviews, error: amazonError } = await supabase
          .from("review_sources")
          .select("id, source, review_text, rating, review_date, created_at")
          .eq("product_source", amazonAsin)
          .eq("source", "amazon");
        
        if (amazonError) {
          console.error("Error fetching Amazon reviews:", amazonError);
        } else if (amazonReviews && amazonReviews.length > 0) {
          // Format Amazon reviews for indexing
          const formattedAmazonReviews: Review[] = amazonReviews.map(review => ({
            id: review.id,
            productId: productId,
            text: review.review_text,
            rating: review.rating,
            source: review.source,
            date: review.review_date || review.created_at,
          }));
          
          allReviews.push(...formattedAmazonReviews);
        }
      } catch (error) {
        console.error("Error processing Amazon reviews:", error);
      }
    }
    
    // Check if we have any reviews to index
    if (allReviews.length === 0) {
      return { 
        success: false, 
        error: "No reviews found for this product" 
      };
    }
    
    console.log(`Found ${allReviews.length} reviews to index from review sources`);
    
    // Call the indexing function
    const result = await indexProductReviews(allReviews, product.name);
    
    // Revalidate the product page
    revalidatePath(`/products/${productId}`);
    
    return result;
  } catch (error) {
    console.error("Error in indexProductReviewsAction:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error during indexing action" 
    };
  }
} 