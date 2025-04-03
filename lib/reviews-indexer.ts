import { 
  VectorStoreIndex, 
  storageContextFromDefaults,
  Document,
  MetadataFilters
} from "llamaindex";
import { getQdrantVectorStore } from "./qdrant";
import { createClient } from "@/app/utils/supabase/server";
import { QdrantClient } from "@qdrant/js-client-rest";

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
  productSource?: string;
}


const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_CLOUD_API;
const COLLECTION_NAME = process.env.QDRANT_COLLECTION_NAME || "Ezra";

/**
 * Creates enriched text for better semantic embeddings for a collection of reviews
 */
function createEnrichedChunkText(reviews: Review[], productName: string): string {
  const reviewTexts = reviews.map(review => {
    return `
${review.title ? `Title: ${review.title}` : ''}
Rating: ${review.rating}/5
Review: ${review.text}
`;
  }).join('');

  return `
Product: ${productName}
Source: ${reviews[0].source}
Reviews:
${reviewTexts}
`.trim();
}

/**
 * Groups reviews into chunks of a specified size
 */
function chunkReviews(reviews: Review[], chunkSize: number = 500): Review[][] {
  const chunks: Review[][] = [];
  for (let i = 0; i < reviews.length; i += chunkSize) {
    chunks.push(reviews.slice(i, i + chunkSize));
  }
  return chunks;
}

function organizeReviewsBySource(reviews: Review[]): Map<string, Review[]> {
  const sourceMap = new Map<string, Review[]>();
  
  reviews.forEach(review => {
    const key = `${review.source}-${review.productSource}`;
    if (!sourceMap.has(key)) {
      sourceMap.set(key, []);
    }
    sourceMap.get(key)?.push(review);
  });
  
  return sourceMap;
}

export async function indexProductReviews(
  reviews: Review[], 
  productName: string,
  sourceInfo?: { source: 'trustpilot' | 'amazon', sourceIdentifier: string }
) {
  try {
    console.log(`Starting to index ${reviews.length} reviews for product: ${productName}`);
    
    // Determine which source(s) to delete based on sourceInfo parameter
    let deleteFilter: any;
    
    if (sourceInfo) {
      console.log(`Specific source indexing: ${sourceInfo.source} - ${sourceInfo.sourceIdentifier}`);
      // If specific source is provided, only delete vectors for that source
      deleteFilter = {
        must: [
          {
            key: "source",
            match: {
              value: sourceInfo.source
            }
          },
          {
            key: "productSource",
            match: {
              value: sourceInfo.sourceIdentifier
            }
          }
        ]
      };
    } else {
      // Legacy behavior: delete all sources found in the reviews
      const productSources = [...new Set(reviews.map(r => r.productSource))].filter(Boolean);
      console.log(`General indexing for sources:`, productSources);
      deleteFilter = {
        must: [{
          key: "productSource",
          match: {
            any: productSources
          }
        }]
      };
    }
    
    // Initialize Qdrant client
    const client = new QdrantClient({ 
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY 
    });

    // Delete existing vectors based on the determined filter
    console.log(`Deleting existing vectors with filter:`, JSON.stringify(deleteFilter, null, 2));
    const deleteResult = await client.delete(COLLECTION_NAME, {
      filter: deleteFilter
    });
    
    console.log('Deletion status:', {
      status: deleteResult.status,
      operationId: deleteResult.operation_id
    });

    // Group reviews by source and product source
    const reviewsBySource = organizeReviewsBySource(reviews);
    
    // Create chunked documents for each source group
    const documents: Document[] = [];
    let totalChunks = 0;
    
    for (const [sourceKey, sourceReviews] of reviewsBySource.entries()) {
      // Get source details from the first review
      const sampleReview = sourceReviews[0];
      const [source, productSource] = sourceKey.split('-');
      
      // Create chunks of reviews
      const chunks = chunkReviews(sourceReviews);
      totalChunks += chunks.length;
      
      // Create a document for each chunk with combined reviews
      chunks.forEach((chunk, chunkIndex) => {
        const chunkText = createEnrichedChunkText(chunk, productName);
        
        documents.push(new Document({
          text: chunkText,
          metadata: {
            productId: sampleReview.productId,
            productName: productName,
            chunkIndex: chunkIndex,
            source: source,
            productSource: productSource,
          }
        }));
      });
    }

    
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
    return { success: true, count: reviews.length, chunks: documents.length };
  } catch (error) {
    console.error("Error indexing reviews:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error during indexing" 
    };
  }
} 