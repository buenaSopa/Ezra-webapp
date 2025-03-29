import { QdrantClient } from "@qdrant/js-client-rest";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get environment variables
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_CLOUD_API;
const COLLECTION_NAME = process.env.QDRANT_COLLECTION_NAME || "Ezra";

// Vector dimensions for OpenAI embeddings
const VECTOR_SIZE = 1536; // Change this if you're using a different embedding model

async function setupQdrant() {
  if (!QDRANT_URL || !QDRANT_API_KEY) {
    console.error("Qdrant URL or API key not provided. Please check your environment variables.");
    process.exit(1);
  }
  
  console.log(`Connecting to Qdrant at ${QDRANT_URL}`);
  
  // Create Qdrant client
  const client = new QdrantClient({ 
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY 
  });
  
  try {
    // Check if collection exists
    const collections = await client.getCollections();
    const collectionExists = collections.collections.some(
      collection => collection.name === COLLECTION_NAME
    );
    
    if (collectionExists) {
      console.log(`Collection '${COLLECTION_NAME}' already exists. No action needed.`);
      return;
    }
    
    // Create collection with scalar quantization
    console.log(`Creating collection '${COLLECTION_NAME}' with scalar quantization...`);
    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: "Cosine",
      },
      quantization_config: {
        scalar: {
          type: "int8",
          quantile: 0.99,
        },
      },
      // Optional: Add HNSW configuration for better performance
      hnsw_config: {
        m: 16,               // Number of edges per node in the index graph
        ef_construct: 100,   // Size of the dynamic candidate list during construction
      },
    });
    
    console.log(`Successfully created collection '${COLLECTION_NAME}' with scalar quantization!`);
    
  } catch (error) {
    console.error("Error setting up Qdrant collection:", error);
    process.exit(1);
  }
}

// Run the setup
setupQdrant().catch(console.error); 