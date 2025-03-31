// lib/chat-engine.ts
import { ContextChatEngine, LLM, MetadataFilters, storageContextFromDefaults, VectorStoreIndex } from "llamaindex";
import { getQdrantVectorStore } from "./qdrant";

export async function createChatEngine(llm: LLM, productId?: string) {

	// Get Qdrant vector store
	const qdrantVectorStore = getQdrantVectorStore();

	// const ctx = await storageContextFromDefaults({ vectorStore: qdrantVectorStore });

	// Create index from the vector store
	const index = await VectorStoreIndex.fromVectorStore(qdrantVectorStore);
	const filters: MetadataFilters = {
		filters: [{
			key: "productId",
			value: productId,
			operator: "=="
		}]
	}

	// Create retriever
	const retriever = index.asRetriever({
		similarityTopK: 50,
		filters: filters
	});

	// Create and return the chat engine
	return new ContextChatEngine({
		retriever,
		chatModel: llm,
	});
}
