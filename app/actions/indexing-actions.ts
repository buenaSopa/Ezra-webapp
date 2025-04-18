"use server";

import { createClient } from "@/app/utils/supabase/server";
import { indexProductReviews, Review } from "@/lib/reviews-indexer";
import { revalidatePath } from "next/cache";

export async function indexProductReviewsAction({
  productId,
  source,
  sourceIdentifier
}: {
  productId: string;
  source?: 'trustpilot' | 'amazon';
  sourceIdentifier?: string;
}) {
  // Create sourceInfo if both source and sourceIdentifier are provided
  const sourceInfo = source && sourceIdentifier ? { source, sourceIdentifier } : undefined;

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
    if (productUrl && (!sourceInfo || sourceInfo.source === 'trustpilot')) {
      try {
        // Extract domain from URL for Trustpilot matching
        let domain = productUrl;

        console.log("Trustpilot Domain:", domain);
        
        // Enhanced query to fetch more fields including review_title and source_data
        const { data: trustpilotReviews, error: trustpilotError } = await supabase
          .from("review_sources")
          .select("id, source, review_text, review_title, rating, review_date, reviewer_name, verified, source_data, created_at")
          .eq("product_source", domain)
          .eq("source", "trustpilot");
        
        if (trustpilotError) {
          console.error("Error fetching Trustpilot reviews:", trustpilotError);
        } else if (trustpilotReviews && trustpilotReviews.length > 0) {
          // Format Trustpilot reviews for indexing with enhanced data
          const formattedTrustpilotReviews: Review[] = trustpilotReviews.map(review => {
            const sourceData = review.source_data as any;
            return {
              id: review.id,
              productId: productId,
              text: review.review_text,
              rating: review.rating,
              source: review.source,
              date: review.review_date || review.created_at,
              // Enhanced fields
              title: review.review_title || sourceData?.reviewTitle,
              productTitle: sourceData?.companyName,
              reviewerName: review.reviewer_name || sourceData?.reviewer,
              verified: review.verified || sourceData?.isReviewVerified,
              productSource: domain
            };
          });
          
          allReviews.push(...formattedTrustpilotReviews);
        }
      } catch (error) {
        console.error("Error processing Trustpilot reviews:", error);
      }
    }
    
    // Fetch Amazon reviews if ASIN exists
    if (amazonAsin && (!sourceInfo || sourceInfo.source === 'amazon')) {
      try {
        // Enhanced query to fetch more fields including review_title and source_data
        const { data: amazonReviews, error: amazonError } = await supabase
          .from("review_sources")
          .select("id, source, review_text, review_title, rating, review_date, reviewer_name, verified, source_data, created_at")
          .eq("product_source", amazonAsin)
          .eq("source", "amazon");
        
        if (amazonError) {
          console.error("Error fetching Amazon reviews:", amazonError);
        } else if (amazonReviews && amazonReviews.length > 0) {
          // Format Amazon reviews for indexing with enhanced data
          const formattedAmazonReviews: Review[] = amazonReviews.map(review => {
            const sourceData = review.source_data as any;
            return {
              id: review.id,
              productId: productId,
              text: review.review_text,
              rating: review.rating,
              source: review.source,
              date: review.review_date || review.created_at,
              // Enhanced fields
              title: review.review_title || sourceData?.ReviewTitle,
              productTitle: sourceData?.ProductTitle,
              reviewerName: review.reviewer_name || sourceData?.Reviewer,
              verified: review.verified || (sourceData?.Verified === "True"),
              productSource: amazonAsin
            };
          });
          
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
    const result = await indexProductReviews(allReviews, product.name, sourceInfo);
    
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