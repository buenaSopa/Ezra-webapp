// lib/chat-engine.ts
import { ContextChatEngine, LLM, MetadataFilters, storageContextFromDefaults, VectorStoreIndex } from "llamaindex";
import { getQdrantVectorStore } from "./qdrant";
import { createClient } from "@/app/utils/supabase/server";
import { adsCreativeTemplate } from "./prompts/prompt";

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
 * Fetches product name for a given product ID
 */
async function getProductName(productId: string): Promise<string | null> {
	try {
		const supabase = createClient();
		
		// Fetch product name from the products table
		const { data: productData, error } = await supabase
			.from("products")
			.select("name")
			.eq("id", productId)
			.single();
			
		if (error) {
			console.error("Error fetching product name:", error);
			return null;
		}
		
		return productData?.name || null;
	} catch (error) {
		console.error("Error in getProductName:", error);
		return null;
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
	
	if (productId) {
		// Fetch product name
		productName = await getProductName(productId);
		console.log(`Product name for ${productId}: ${productName || 'Unknown'}`);

    // First check if product already has a summary in metadata
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("metadata")
      .eq("id", productId)
      .single();
    
    // If product already has a summary and it's not too old, return it
    if (product?.metadata?.summary) {
        productSummary = product.metadata.summary;
    }
    
		// Fetch competitor IDs for the given product
		const competitorIds = await getCompetitorIds(productId);
		console.log(`Found ${competitorIds.length} competitors for product ${productId}`);
		
		// Fetch competitor names if there are any competitors
		if (competitorIds.length > 0) {
			competitorNames = await getCompetitorNames(competitorIds);
			console.log(`Competitor names: ${competitorNames.join(', ') || 'None found'}`);
		}
		
		// Create a filter that includes both the main product and its competitors
		if (competitorIds.length > 0) {
			// If there are competitors, create an OR filter with all product IDs
			const allProductIds = [productId, ...competitorIds];
			
			filters = {
				filters: [{
					key: "productId",
					value: allProductIds,
					operator: "in"
				}]
			};
			
			console.log(`Using filter with ${allProductIds.length} products: ${JSON.stringify(filters)}`);
		} else {
			// If no competitors, just use the main product ID
			filters = {
				filters: [{
					key: "productId",
					value: productId,
					operator: "=="
				}]
			};
		}
	} else {
		// If no product ID provided, don't apply any filter
		filters = {
			filters: []
		};
	}

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

	Product summary of ${productName}:
	${productSummary}

	if user ask for product summary, give them the summary above

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
“I’ve tried everything but nothing works” (High awareness, saturated audience angle)
Winter dryness in Northern India (Regional angle)
Angles bring the concept to life through context. They create relevance.

if user's ask for like ads script or ad concepts u can use these templates, choose one of them based on either user's 
query or your best judgement as a creative strategist expert:
: ${adsCreativeTemplate}
	
important: do not make up reviews that are not given to u, only use the ones that are given
`;

console.log('LLM', llm)

	// Create and return the chat engine
	return new ContextChatEngine({
		retriever,
		chatModel: llm,
		systemPrompt: systemPrompt
	});
}
