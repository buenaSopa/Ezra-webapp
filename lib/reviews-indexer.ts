import { 
  VectorStoreIndex, 
  storageContextFromDefaults,
  Document
} from "llamaindex";
import { getQdrantVectorStore } from "./qdrant";
import { createClient } from "@/app/utils/supabase/server";

export interface Review {
  id: string;
  productId: string;
  text: string;
  rating: number;
  source: string;
  date: string;
  // Enhanced fields for better embeddings
  title?: string;
  productTitle?: string;
  reviewerName?: string;
  verified?: boolean;
}

/**
 * Creates enriched text for better semantic embeddings
 */
function createEnrichedEmbeddingText(review: Review, productName: string): string {
  return `
Product: ${review.productTitle || productName}
${review.title ? `Title: ${review.title}` : ''}
Rating: ${review.rating}/5
${review.verified ? 'Verified Purchase' : ''}
Review: ${review.text}
`.trim();
}

export async function indexProductReviews(reviews: Review[], productName: string) {
  try {
    console.log(`Starting to index ${reviews.length} reviews for product: ${productName}`);
    
    // Create Document objects for indexing with enriched text
    const documents = reviews.map(review => {
      // Create enriched text that combines all relevant context
      const enrichedText = createEnrichedEmbeddingText(review, productName);
      
      return new Document({
        text: enrichedText,
        metadata: {
          productId: review.productId,
          productName: productName,
          reviewId: review.id,
          rating: review.rating,
          source: review.source,
          date: review.date,
          title: review.title,
          verified: review.verified
        }
      });
    });

    console.log(`Created ${documents.length} documents for indexing`);
    
    // Get Qdrant vector store
    const qdrantVectorStore = getQdrantVectorStore();
    
    // Create storage context with the vector store
    const storageContext = await storageContextFromDefaults({ 
      vectorStore: qdrantVectorStore 
    });
    
    // Create and store the index
    console.log("Creating vector index...");
    const index = await VectorStoreIndex.fromDocuments(documents, {
      storageContext,
    });
    
    // Update the last_indexed_at timestamp in the product table
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('products')
      .update({ 
        last_indexed_at: new Date().toISOString() 
      })
      .eq('id', reviews[0].productId);
    
    if (updateError) {
      console.error("Error updating last_indexed_at timestamp:", updateError);
    }
    
    console.log("Successfully indexed reviews to Qdrant");
    return { success: true, count: reviews.length };
  } catch (error) {
    console.error("Error indexing reviews:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error during indexing" 
    };
  }
} 