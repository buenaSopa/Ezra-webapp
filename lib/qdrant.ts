import { QdrantVectorStore } from "@llamaindex/qdrant";
import { Settings, NodeWithScore, MetadataMode } from "llamaindex";

// Optional logging for debugging
Settings.callbackManager.on("retrieve-end", (event) => {
  const { nodes } = event.detail;
  console.log(
    "Retrieved nodes:", 
    nodes.map((node: NodeWithScore) => node.node.getContent(MetadataMode.NONE))
  );
});

// Qdrant connection configuration
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_CLOUD_API;
const COLLECTION_NAME = process.env.QDRANT_COLLECTION_NAME || "Ezra";

export function getQdrantVectorStore() {
  if (!QDRANT_URL || !QDRANT_API_KEY) {
    throw new Error("Qdrant URL or API key not provided");
  }
  
  console.log(`Connecting to Qdrant at ${QDRANT_URL} with collection ${COLLECTION_NAME}`);
  
  return new QdrantVectorStore({ 
    url: QDRANT_URL, 
    collectionName: COLLECTION_NAME,
    apiKey: QDRANT_API_KEY
  });
} 