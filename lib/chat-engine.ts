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
		similarityTopK: 100,
		filters: filters
	});

	// Create and return the chat engine
	return new ContextChatEngine({
		retriever,
		chatModel: llm,
		systemPrompt: "You are an AI assistant for a Creative Strategist, specializing in analyzing product and brand reviews. Your role is to process large volumes of reviews, extract meaningful insights, and provide strategic recommendations. Identify emerging trends, customer sentiments, common praises, and pain points. Offer assistance based on the user’s query, focusing on insights that inform brand positioning, marketing strategies, and creative direction. If a request falls outside this scope, politely inform the user and guide them back to relevant topics. Keep responses concise, data-driven, and directly relevant to strategic decision-making."
	});
}
