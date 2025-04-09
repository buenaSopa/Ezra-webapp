"use server";

import { OpenAI } from "@llamaindex/openai";
import { Settings, VectorStoreIndex, MetadataFilters } from "llamaindex";
import { createClient } from "@/app/utils/supabase/server";
import { getQdrantVectorStore } from "@/lib/qdrant";
import { z } from "zod";

// Define schema for the insights result
const insightsSchema = z.object({
  benefits: z.array(z.object({
    benefit: z.string(),
    frequency: z.number(),
    examples: z.array(z.string())
  })),
  painPoints: z.array(z.object({
    painPoint: z.string(),
    examples: z.array(z.string())
  })),
  valuedFeatures: z.array(z.object({
    feature: z.string(),
    examples: z.array(z.string())
  })),
  priorObjections: z.array(z.object({
    objection: z.string(),
    examples: z.array(z.string())
  })),
  failedSolutions: z.array(z.object({
    solution: z.string(),
    examples: z.array(z.string())
  })),
  emotionalTriggers: z.array(z.object({
    trigger: z.string(),
    examples: z.array(z.string())
  })),
  customerPersonas: z.array(z.object({
    name: z.string(),
    description: z.string(),
    needs: z.array(z.string()),
    painPoints: z.array(z.string())
  })),
  headlines: z.array(z.string()),
  competitivePositioning: z.array(z.object({
    angle: z.string(),
    explanation: z.string()
  })),
  triggerEvents: z.array(z.string()),
  objectionResponses: z.array(z.object({
    objection: z.string(),
    response: z.string()
  })),
  hooks: z.array(z.string())
});

type ProductInsights = z.infer<typeof insightsSchema>;

/**
 * Generates marketing insights for a product using LlamaIndex and OpenAI
 */
export async function generateProductInsights(productId: string) {
  console.log(`Generating insights for product: ${productId}`);
  
  try {
    const supabase = createClient();
    
    // Fetch product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();
    
    if (productError || !product) {
      throw new Error(`Product not found: ${productError?.message || "Unknown error"}`);
    }
    
    // Check if we already have recent insights in the product metadata
    if (product.metadata?.insights && product.metadata?.insights_generated_at) {
      const lastGenerated = new Date(product.metadata.insights_generated_at);
      const now = new Date();
      const hoursSinceGeneration = (now.getTime() - lastGenerated.getTime()) / (1000 * 60 * 60);
      
      // If insights were generated in the last 24 hours, return them
      if (hoursSinceGeneration < 24) {
        console.log(`Using existing insights from ${hoursSinceGeneration.toFixed(1)} hours ago`);
        return {
          success: true,
          insights: product.metadata.insights,
          cached: true
        };
      }
    }
    
    // Configure OpenAI with JSON response format
    const llm = new OpenAI({
      model: "gpt-4o-mini",
      temperature: 0.2,
      apiKey: process.env.OPENAI_API_KEY,
      // @ts-ignore - Ignoring type error as the library types might be outdated
      responseFormat: insightsSchema
    });
    
    // Store original LLM settings to restore later
    const originalLLM = Settings.llm;
    
    try {
      // Temporarily set our LLM for this operation
      Settings.llm = llm;
      
      // Get the existing vector store that contains already indexed reviews
      console.log("Connecting to vector store...");
      const qdrantVectorStore = getQdrantVectorStore();
      
      // Create index from the vector store
      const index = await VectorStoreIndex.fromVectorStore(qdrantVectorStore);
      
      // Create a filter for just this product's reviews
      const filters: MetadataFilters = {
        filters: [{
          key: "productId",
          value: productId,
          operator: "=="
        }]
      };
      
      // Create retriever with filters
      const retriever = index.asRetriever({
        similarityTopK: 50, // Retrieve more nodes for better analysis
        filters: filters
      });
      
      // Create query engine
      console.log("Creating query engine...");
      const queryEngine = index.asQueryEngine({
        retriever: retriever
      });
      
      // Define the prompt for generating insights
      const insightsPrompt = `
        You are an expert marketing analyst. Analyze the product reviews and generate comprehensive marketing insights.
        
        Return your analysis in a structured JSON format with the following categories:
        
        1. benefits: Array of objects with benefit name, frequency (number), and example quotes
        2. painPoints: Array of objects with pain point and example quotes
        3. valuedFeatures: Array of objects with feature and example quotes
        4. priorObjections: Array of objects with objection and example quotes
        5. failedSolutions: Array of objects with solution and example quotes
        6. emotionalTriggers: Array of objects with trigger and example quotes
        7. customerPersonas: Array of 5 distinct customer personas with name, description, needs, and pain points
        8. headlines: Array of 10 ready-to-use marketing headlines
        9. competitivePositioning: Array of objects with positioning angle and explanation
        10. triggerEvents: Array of specific events that trigger product need
        11. objectionResponses: Array of objects with common objections and effective responses
        12. hooks: Array of 8 one-liner hooks for marketing
        
        For each insight that requires examples, include at least 2-3 direct quotes from reviews.
        Ensure all insights are data-driven and based on patterns found in the reviews.
        
        Your response will be parsed and validated according to a strict schema, so ensure it matches the expected format.
      `;
      
      // Query the engine
      console.log("Generating insights...");
      const response = await queryEngine.query({
        query: insightsPrompt,
      });
      
      // Get the response and process it
      console.log("Response received, processing...");
      
      // The response should now be properly structured according to our schema
      // but we need to handle possible formatting issues
      let parsedInsights: ProductInsights;
      
      try {
        const responseText = response.response;
        
        // Check if the response is wrapped in code blocks and extract the JSON
        const jsonRegex = /```(?:json)?\s*([\s\S]*?)```|({[\s\S]*})/m;
        const match = responseText.match(jsonRegex);
        
        let jsonContent = responseText;
        if (match && match[1]) {
          // Extract JSON from code block
          jsonContent = match[1].trim();
        } else if (match && match[2]) {
          // Extract direct JSON
          jsonContent = match[2].trim();
        }
        
        // Parse and validate with Zod
        const jsonResponse = JSON.parse(jsonContent);
        parsedInsights = insightsSchema.parse(jsonResponse);
        
        console.log("Successfully parsed and validated insights");
      } catch (error) {
        console.error("Error processing insights response:", error);
        throw new Error("Failed to parse or validate the AI generated insights. Error: " + (error instanceof Error ? error.message : String(error)));
      }
      
      // Store the insights
      const { error: insertError } = await supabase
        .from("products")
        .update({
          metadata: {
            ...product.metadata, // Preserve existing metadata
            insights: parsedInsights,
            insights_generated_at: new Date().toISOString()
          }
        })
        .eq("id", productId);
      
      if (insertError) {
        console.error("Error storing insights in product metadata:", insertError);
      }
      
      return {
        success: true,
        insights: parsedInsights,
        cached: false
      };
    } finally {
      // Restore original LLM settings
      Settings.llm = originalLLM;
    }
    
  } catch (error: any) {
    console.error("Error generating product insights:", error);
    return {
      success: false,
      error: error.message || "Unknown error occurred"
    };
  }
}

/**
 * Retrieves the latest generated insights for a product from its metadata
 */
export async function getProductInsights(productId: string) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from("products")
      .select("metadata")
      .eq("id", productId)
      .single();
    
    if (error) {
      throw new Error(`Error fetching product: ${error.message}`);
    }
    
    if (!data?.metadata?.insights) {
      return {
        success: false,
        error: "No insights found for this product"
      };
    }
    
    return {
      success: true,
      insights: data.metadata.insights,
      generatedAt: data.metadata.insights_generated_at
    };
    
  } catch (error: any) {
    console.error("Error in getProductInsights:", error);
    return {
      success: false,
      error: error.message || "Unknown error occurred"
    };
  }
} 