// lib/chat-engine.ts
import { ContextChatEngine, LLM, MetadataFilters, storageContextFromDefaults, VectorStoreIndex } from "llamaindex";
import { getQdrantVectorStore } from "./qdrant";
import { createClient } from "@/app/utils/supabase/server";

/**
 * Fetches competitor product IDs for a given product
 */
async function getCompetitorIds(productId: string): Promise<string[]> {
	try {
		const supabase = createClient();
		
		// Fetch competitor relationships from the product_to_competitors table
		const { data: competitorRelations, error } = await supabase
			.from("product_to_competitors")
			.select("competitor_product_id")
			.eq("product_id", productId);
			
		if (error) {
			console.error("Error fetching competitor IDs:", error);
			return [];
		}
		
		// Extract competitor IDs from the relations
		return competitorRelations.map(relation => relation.competitor_product_id);
	} catch (error) {
		console.error("Error in getCompetitorIds:", error);
		return [];
	}
}
/**
 * Fetches competitor names for a given array of competitor IDs
 */
async function getCompetitorNames(competitorIds: string[]): Promise<string[]> {
	if (!competitorIds.length) return [];
	
	try {
		const supabase = createClient();
		
		// Fetch competitor names from the products table
		const { data: competitorData, error } = await supabase
			.from("products")
			.select("name")
			.in("id", competitorIds);
			
		if (error) {
			console.error("Error fetching competitor names:", error);
			return [];
		}
		
		// Extract and return the names
		return competitorData.map(competitor => competitor.name).filter(Boolean);
	} catch (error) {
		console.error("Error in getCompetitorNames:", error);
		return [];
	}
}


export async function createRetrieverForDocumentResources(productId: string) {
	const supabase = createClient();
	const qdrantVectorStore = getQdrantVectorStore();
	let filters: MetadataFilters;

	const index = await VectorStoreIndex.fromVectorStore(qdrantVectorStore);

	const { data: resources, error } = await supabase
		.from("product_marketing_resources")
		.select("id")
		.eq("product_id", productId);

	if (!resources) {
		return null;
	}

	filters = {
		filters: [{
			key: "resourceId",
			value: resources.map(resource => resource.id),
			operator: "in"
		}]
	}

	const retriever = index.asRetriever({
		similarityTopK: 8,
		filters: filters
	});

	return retriever
}

export async function createChatEngine(llm: LLM, productId?: string) {
	// Get Qdrant vector store
	const qdrantVectorStore = getQdrantVectorStore();
    const supabase = createClient();

	// Create index from the vector store
	const index = await VectorStoreIndex.fromVectorStore(qdrantVectorStore);
	
	let filters: MetadataFilters;
	let productName: string | null = null;
	let competitorNames: string[] = [];
	let productSummary: string | null = null;
	let productSources: string[] = [];
	let competitorSources: string[] = [];
	let uploadedDocumentResources: string[] = [];
	
		// Fetch product name and metadata
		const { data: product, error: productError } = await supabase
			.from("products")
			.select("name, metadata")
			.eq("id", productId)
			.single();
			
		if (productError) {
			console.error("Error fetching product:", productError);
		} else {
			productName = product.name;
			console.log(`Product name for ${productId}: ${productName || 'Unknown'}`);
			
			// If product already has a summary
			if (product?.metadata?.summary) {
				productSummary = product.metadata.summary;
			}
			
			// Get product sources from metadata
			if (product?.metadata?.url) {
				// Extract domain from URL for matching
					productSources.push(product.metadata.url);

			}
			
			if (product?.metadata?.amazon_asin) {
				productSources.push(product.metadata.amazon_asin);
			}
		}
    
		// Fetch competitor IDs for the given product
		const competitorIds = await getCompetitorIds(productId!);
		console.log(`Found ${competitorIds.length} competitors for product ${productId}`);
		
		// Fetch competitor names and sources if there are any competitors
		if (competitorIds.length > 0) {
			// Get competitor names
			competitorNames = await getCompetitorNames(competitorIds);
			console.log(`Competitor names: ${competitorNames.join(', ') || 'None found'}`);
			
			// Get competitor sources
			try {
				const { data: competitors, error: competitorsError } = await supabase
					.from("products")
					.select("metadata")
					.in("id", competitorIds);
					
				if (!competitorsError && competitors) {
					for (const competitor of competitors) {
						if (competitor?.metadata?.url) {
								competitorSources.push(competitor.metadata.url);
						
						}
						
						if (competitor?.metadata?.amazon_asin) {
							competitorSources.push(competitor.metadata.amazon_asin);
						}
					}
				}
			} catch (error) {
				console.error("Error fetching competitor sources:", error);
			}
		}
		
		// Fetch uploaded document resources for this product
		try {
			const { data: resources, error: resourcesError } = await supabase
				.from("product_marketing_resources")
				.select("id")
				.eq("product_id", productId)
				
			if (!resourcesError && resources && resources.length > 0) {
				console.log(`Found ${resources.length} uploaded document resources for product ${productId}`);
				uploadedDocumentResources = resources.map(resource => resource.id);
			}
		} catch (error) {
			console.error("Error fetching document resources:", error);
		}
		
		// Create a filter based on available data
		const allSources = [...productSources, ...competitorSources].filter(Boolean);
		
		// If we have URL or ASIN sources, use those in the filter
		if (allSources.length > 0) {
			filters = {
				filters: [{
					key: "productSource",
					value: allSources,
					operator: "in"
				}]
			};
			
			console.log(`Using filter with sources: ${JSON.stringify(allSources)}`);
		} 
		// Otherwise, if we have uploaded document resources, use those in the filter
		else if (uploadedDocumentResources.length > 0) {
			filters = {
				filters: [{
					key: "resourceId",
					value: uploadedDocumentResources,
					operator: "in"
				}]
			};
			
			console.log(`Using filter with document resources: ${JSON.stringify(uploadedDocumentResources)}`);
		}
		// If nothing else, don't apply any filter
		else {
			// Default empty filter when no sources are available
			filters = { filters: [] };
			console.log(`No sources or resources found for product ${productId}, using empty filter`);
		}
			
		console.log(`Filter: ${JSON.stringify(filters)}`);

	

	// Create retriever
	const retriever = index.asRetriever({
		similarityTopK: 5,
		filters: filters
	});
	
	console.log('Summary', productSummary)

	// Base sys
	let systemPrompt
	// Add product-specific context if we have a product name
	if (productName) {
		// Format the competitors list for the prompt
		let competitorsText = '';
		if (competitorNames.length > 0) {
			competitorsText = `The competitors for this product are: ${competitorNames.join(', ')}.`;
		}
		
		systemPrompt = `
		You are an AI assistant for a Creative Strategist, specializing in analyzing reviews for the product "${productName}" and its competitors. Your role is to process large volumes of reviews, extract meaningful insights, and provide strategic creative ads recommendations specific to "${productName}".

		${competitorsText}
	
		Identify emerging trends, customer sentiments, common praises, and pain points across "${productName}" and its competitors. Compare and contrast how "${productName}" performs against competitors, highlighting competitive advantages and areas for improvement.
	
		Offer assistance based on the user's query, focusing on insights that inform brand positioning, marketing strategies, and creative direction for "${productName}". If asked about specific competitors, provide detailed analysis about those competitors.
	
		If a request falls outside this scope, politely inform the user and guide them back to relevant topics. Keep responses concise, data-driven, and directly relevant to strategic decision-making.
		`;
	}
	
	// Add the ad terminology section
	systemPrompt += `
	terminology:
	Concept
	A concept is the broad problem, benefit, or theme being addressed in an ad or campaign. It acts as the foundation for creative strategy. Concepts are not specific to a moment or audience — they define what the ad is about at a core level.
	Examples:
	Dry skin
	Hairfall
	Fast shipping
	Low energy
	Detanning
	Sleep issues
	Think of the concept as the category of desire or frustration the ad will speak to.

	Angle
	An angle is the specific lens, context, or scenario used to present a concept. It defines how the concept is positioned for a particular audience, moment, or mindset. A single concept can have dozens of angles depending on use case, season, persona, or trigger.
	Examples (for the concept of Dry Skin):
		Dry skin ruining your birthday photos (Event-based angle)
	Post-flight dryness and skincare fatigue (Lifestyle angle)
	"I've tried everything but nothing works" (High awareness, saturated audience angle)
	Winter dryness in Northern India (Regional angle)
	Angles bring the concept to life through context. They create relevance.

	imortant: do not make up reviews that are not given to you, only use the ones that are given
	`;

	console.log('LLM', llm)

	// Create and return the chat engine
	return new ContextChatEngine({
		retriever,
		chatModel: llm,
		systemPrompt: systemPrompt
	});
}
