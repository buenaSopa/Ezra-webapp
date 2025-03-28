// lib/chat-engine.ts
import { ContextChatEngine, LLM, storageContextFromDefaults, VectorStoreIndex } from "llamaindex";
import { getQdrantVectorStore } from "./qdrant";

export async function createChatEngine(llm: LLM, productId?: string) {

	// Get Qdrant vector store
	const qdrantVectorStore = getQdrantVectorStore();

	// const ctx = await storageContextFromDefaults({ vectorStore: qdrantVectorStore });

	// Create index from the vector store
	const index = await VectorStoreIndex.fromVectorStore(qdrantVectorStore);

	// Create retriever
	const retriever = index.asRetriever({
		similarityTopK: 40
	});

	// Create and return the chat engine
	return new ContextChatEngine({
		retriever,
		chatModel: llm
	});
}
