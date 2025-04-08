import { 
  VectorStoreIndex, 
  storageContextFromDefaults,
  Document
} from "llamaindex";
import { getQdrantVectorStore } from "./qdrant";
import { createClient } from "@/app/utils/supabase/server";
import { QdrantClient } from "@qdrant/js-client-rest";

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_CLOUD_API;
const COLLECTION_NAME = process.env.QDRANT_COLLECTION_NAME || "Ezra";

interface ResourceMetadata {
  resourceId: string;
  productId: string;
  productName: string;
  resourceType: string;
  title: string;
  description?: string;
  isCompetitor?: boolean;
  competitorName?: string;
}

/**
 * Takes a file buffer from storage and indexes it into the vector database
 */
export async function indexDocumentFile(
  fileBuffer: Buffer,
  fileName: string,
  metadata: ResourceMetadata
) {
  try {
    console.log(`Starting to index document: ${fileName} for product: ${metadata.productName}`);
    
    // Delete existing vectors for this resource if they exist
    await deleteExistingVectors(metadata.resourceId);
    
    // Create a document with the file content
    const fileContent = fileBuffer.toString('utf-8');
    
    // Create document with metadata
    const document = new Document({
      text: fileContent,
      metadata: {
        resourceId: metadata.resourceId,
        productId: metadata.productId,
        productName: metadata.productName,
        resourceType: metadata.resourceType, 
        title: metadata.title,
        description: metadata.description || '',
        isCompetitor: metadata.isCompetitor || false,
        competitorName: metadata.competitorName || '',
        fileName: fileName,
        source: 'document',
      }
    });
    
    // Get Qdrant vector store
    const qdrantVectorStore = getQdrantVectorStore();
    
    // Create storage context with the vector store
    const storageContext = await storageContextFromDefaults({ 
      vectorStore: qdrantVectorStore 
    });
    
    // Create and store the index
    console.log("Creating vector index...");
    const index = await VectorStoreIndex.fromDocuments([document], {
      storageContext
    });
    
    // Update the product's last_indexed_at timestamp
    await updateProductIndexedTimestamp(metadata.productId);
    
    console.log(`Successfully indexed document ${fileName} to Qdrant`);
    return { success: true, chunks: 1 };
    
  } catch (error) {
    console.error("Error indexing document:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Deletes existing vectors for a resource
 */
async function deleteExistingVectors(resourceId: string) {
  try {
    // Initialize Qdrant client
    const client = new QdrantClient({ 
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY 
    });
    
    // Define filter for the resource
    const deleteFilter = {
      must: [{
        key: "resourceId",
        match: {
          value: resourceId
        }
      }]
    };
    
    console.log(`Deleting existing vectors with filter:`, JSON.stringify(deleteFilter, null, 2));
    
    // Perform the deletion
    const deleteResult = await client.delete(COLLECTION_NAME, {
      filter: deleteFilter
    });
    
    console.log('Deletion status:', {
      status: deleteResult.status,
      operationId: deleteResult.operation_id
    });
    
    return deleteResult;
  } catch (error) {
    console.error(`Error deleting vectors for resource ${resourceId}:`, error);
    throw error;
  }
}

/**
 * Updates the last_indexed_at timestamp for a product
 */
async function updateProductIndexedTimestamp(productId: string) {
  const supabase = createClient();
  const { error: updateError } = await supabase
    .from('products')
    .update({ 
      last_indexed_at: new Date().toISOString() 
    })
    .eq('id', productId);
  
  if (updateError) {
    console.error("Error updating last_indexed_at timestamp:", updateError);
    throw updateError;
  }
} 