"use server";

import { createClient } from "@/app/utils/supabase/server";
import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { createRetrieverForDocumentResources } from "@/lib/chat-engine";

// Split the schema into 5 separate schemas for parallel processing

// Schema 1a: Positive Customer Feedback Schema (benefits, valued features)
const positiveCustomerFeedbackSchema = z.object({
  benefits: z.array(z.object({
    benefit: z.string().describe("A clear benefit that customers get from the product"),
    frequency: z.number().describe("Number indicating how frequently this benefit was mentioned"),
    examples: z.array(z.string().describe("Direct quotes from reviews mentioning this benefit"))
  })),
  valuedFeatures: z.array(z.object({
    feature: z.string().describe("A feature of the product that customers value"),
    examples: z.array(z.string().describe("Direct quotes from reviews mentioning this feature"))
  }))
});

// Schema 1b: Negative Customer Feedback Schema (complaints, pain points)
const negativeCustomerFeedbackSchema = z.object({
  complaints: z.array(z.object({
    complaint: z.string().describe("A complaint customers had about the product"),
    examples: z.array(z.string().describe("Direct quotes from reviews mentioning this complaint"))
  })),
  painPoints: z.array(z.object({
    painPoint: z.string().describe("A pain point or problem customers faced before using the product"),
    examples: z.array(z.string().describe("Direct quotes from reviews mentioning this pre-purchase pain point"))
  }))
});

// Schema 2: Objection Handling Schema (prior objections, objection responses)
const objectionHandlingSchema = z.object({
  priorObjections: z.array(z.object({
    objection: z.string().describe("An objection customers had before purchasing"),
    examples: z.array(z.string().describe("Direct quotes from reviews mentioning this objection"))
  })),
  objectionResponses: z.array(z.object({
    objection: z.string().describe("A common objection to purchasing"),
    response: z.string().describe("Effective response to overcome this objection")
  }))
});

// Schema 3: Customer Journey Schema (failed solutions, emotional triggers, trigger events)
const customerJourneySchema = z.object({
  failedSolutions: z.array(z.object({
    solution: z.string().describe("A solution customers tried before that failed"),
    examples: z.array(z.string().describe("Direct quotes from reviews mentioning this failed solution"))
  })),
  emotionalTriggers: z.array(z.object({
    trigger: z.string().describe("An emotional trigger that drove purchase decisions"),
    examples: z.array(z.string().describe("Direct quotes from reviews showing this emotional trigger"))
  })),
  triggerEvents: z.array(z.string().describe("Events that trigger the need for this product"))
});

// Schema for Customer Personas based on awareness levels
const customerPersonasSchema = z.object({
  customerPersonas: z.array(z.object({
    awarenessLevel: z.string().describe("The awareness level (Most Aware, Product Aware, Solution Aware, Problem Aware, Completely Unaware)"),
    name: z.string().describe("Name representing this persona"),
    demographicSketch: z.string().describe("Age range, life stage, tone of voice"),
    emotionalState: z.string().describe("How they feel about their situation"),
    internalBeliefs: z.string().describe("What they believe about products like this"),
    currentBehaviors: z.string().describe("What they're doing now to fix the problem"),
    keyFrustration: z.string().describe("What's not working for them"),
    desiredTransformation: z.string().describe("What outcome they want emotionally or practically"),
    triggerPhrase: z.string().describe("A thought or line that shows their mindset"),
    hookThatWouldWork: z.string().describe("A message or ad idea that would immediately resonate"),
    voiceOfCustomerQuote: z.string().describe("A direct or paraphrased line from a real review that represents their thinking")
  }))
});

// Schema 4: Marketing Copy Schema (headlines, competitive positioning, hooks)
const marketingCopySchema = z.object({
  headlines: z.array(z.string().describe("Ready-to-use marketing headline")),
  competitivePositioning: z.array(z.object({
    angle: z.string().describe("A competitive positioning angle"),
    explanation: z.string().describe("Explanation of why this positioning would be effective")
  })),
  hooks: z.array(z.string().describe("One-liner hook for marketing copy"))
});

// Define complete schema for combining results and maintaining backward compatibility
const insightsSchema = z.object({
  benefits: z.array(z.object({
    benefit: z.string(),
    frequency: z.number(),
    examples: z.array(z.string())
  })),
  complaints: z.array(z.object({
    complaint: z.string(),
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
    awarenessLevel: z.string(),
    name: z.string(),
    demographicSketch: z.string(),
    emotionalState: z.string(),
    internalBeliefs: z.string(),
    currentBehaviors: z.string(),
    keyFrustration: z.string(),
    desiredTransformation: z.string(),
    triggerPhrase: z.string(),
    hookThatWouldWork: z.string(),
    voiceOfCustomerQuote: z.string()
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

// Type definition for reviews
type ReviewSource = {
  id: string;
  product_source: string;
  source: string;
  source_id: string;
  review_text: string;
  review_title?: string;
  rating: number;
  review_date?: string;
  reviewer_name?: string;
  verified?: boolean;
  source_data?: any;
  created_at?: string;
};

/**
 * Generate positive customer feedback insights (benefits, valued features)
 */
async function generatePositiveCustomerFeedbackInsights(productName: string, reviewsText: string) {
  const prompt = `As an expert marketing analyst, analyze these product reviews and generate positive customer feedback insights.

PRODUCT NAME: ${productName}

REVIEWS:
${reviewsText}

Based on these reviews, generate structured insights for:
1. Benefits ranked by frequency (with example quotes)
2. Features they value most (with example quotes)

Ensure all insights are data-driven and based on patterns found in the reviews.
For each insight, include at least 2-3 direct quotes from reviews as examples.`;

  console.time("positive-customer-feedback-generation-time");
  const model = openai("gpt-4o-mini");
  
  const { object } = await generateObject({
    model,
    schema: positiveCustomerFeedbackSchema,
    schemaName: "PositiveCustomerFeedbackInsights",
    schemaDescription: "Structured positive customer feedback insights derived from product reviews",
    prompt,
    temperature: 0.2,
    maxTokens: 1500,
  });
  
  console.timeEnd("positive-customer-feedback-generation-time");
  console.log("Successfully generated positive customer feedback insights");
  
  return object;
}

/**
 * Generate negative customer feedback insights (complaints, pain points)
 */
async function generateNegativeCustomerFeedbackInsights(productName: string, reviewsText: string) {
  const prompt = `As an expert marketing analyst, analyze these product reviews and generate negative customer feedback insights.

PRODUCT NAME: ${productName}

REVIEWS:
${reviewsText}

Based on these reviews, generate structured insights for:
1. Complaints customers had about the product (with example quotes)
2. Pain points that customers faced before using this product (with example quotes)

Ensure all insights are data-driven and based on patterns found in the reviews.
For each insight, include at least 2-3 direct quotes from reviews as examples.`;

  console.time("negative-customer-feedback-generation-time");
  const model = openai("gpt-4o-mini");
  
  const { object } = await generateObject({
    model,
    schema: negativeCustomerFeedbackSchema,
    schemaName: "NegativeCustomerFeedbackInsights",
    schemaDescription: "Structured negative customer feedback insights derived from product reviews",
    prompt,
    temperature: 0.2,
    maxTokens: 1500,
  });
  
  console.timeEnd("negative-customer-feedback-generation-time");
  console.log("Successfully generated negative customer feedback insights");
  
  return object;
}

/**
 * Generate objection handling insights (prior objections, objection responses)
 */
async function generateObjectionHandlingInsights(productName: string, reviewsText: string) {
  const prompt = `As an expert marketing analyst, analyze these product reviews and generate objection handling insights.

PRODUCT NAME: ${productName}

REVIEWS:
${reviewsText}

Based on these reviews, generate structured insights for:
1. Prior objections customers had before purchasing (with example quotes)
2. Effective responses to common objections customers might have

Ensure all insights are data-driven and based on patterns found in the reviews.
For prior objections, include at least 2-3 direct quotes from reviews as examples.`;

  console.time("objection-handling-generation-time");
  const model = openai("gpt-4o-mini");
  
  const { object } = await generateObject({
    model,
    schema: objectionHandlingSchema,
    schemaName: "ObjectionHandlingInsights",
    schemaDescription: "Structured objection handling insights derived from product reviews",
    prompt,
    temperature: 0.3,
    maxTokens: 1000,
  });
  
  console.timeEnd("objection-handling-generation-time");
  console.log("Successfully generated objection handling insights");
  
  return object;
}

/**
 * Generate customer journey insights (failed solutions, emotional triggers, trigger events)
 */
async function generateCustomerJourneyInsights(productName: string, reviewsText: string) {
  const prompt = `As an expert marketing analyst, analyze these product reviews and generate customer journey insights.

PRODUCT NAME: ${productName}

REVIEWS:
${reviewsText}

Based on these reviews, generate structured insights for:
1. Failed solutions customers tried before (with example quotes)
2. Emotional triggers driving purchase decisions (with example quotes)
3. Specific trigger events that lead customers to need this product

Ensure all insights are data-driven and based on patterns found in the reviews.
For failed solutions and emotional triggers, include at least 2-3 direct quotes from reviews as examples.`;

  console.time("customer-journey-generation-time");
  const model = openai("gpt-4o-mini");
  
  const { object } = await generateObject({
    model,
    schema: customerJourneySchema,
    schemaName: "CustomerJourneyInsights",
    schemaDescription: "Structured customer journey insights derived from product reviews",
    prompt,
    temperature: 0.4,
    maxTokens: 1500,
  });
  
  console.timeEnd("customer-journey-generation-time");
  console.log("Successfully generated customer journey insights");
  
  return object;
}

/**
 * Generate customer personas based on Eugene Schwartz's awareness levels
 */
async function generateCustomerPersonasInsights(productName: string, reviewsText: string) {
  const prompt = `As an expert marketing analyst, analyze these product reviews and generate customer personas based on Eugene Schwartz's awareness levels.

PRODUCT NAME: ${productName}

REVIEWS:
${reviewsText}

Generate 5 avatars, one for each awareness level from Eugene Schwartz:
 
- Most Aware: Customers who know your product and only need to know the deal
- Product Aware: Customers who know what you sell but aren't sure it's right for them
- Solution Aware: Customers who know the result they want but not that your product provides it
- Problem Aware: Customers who know they have a problem but don't know there's a solution
- Completely Unaware: Customers who don't know they have a problem that needs solving
 
Each avatar should include:
 
Awareness Level: (one of the five levels above)
Name + Demographic Sketch: (age range, life stage, tone of voice)
Emotional State: (how they feel about their situation)
Internal Beliefs: (what they believe about products like this)
Current Behaviors: (what they're doing now to fix the problem)
Key Frustration: (what's not working for them)
Desired Transformation: (what outcome they want emotionally or practically)
Trigger Phrase: (a thought or line that shows their mindset)
Hook That Would Work: (a message or ad idea that would immediately resonate)
Voice-of-Customer Quote: (a direct or paraphrased line from a real review that represents their thinking)

Make sure these personas are drawn directly from patterns identified in the reviews and reflect real customer segments.`;

  console.time("customer-personas-generation-time");
  const model = openai("gpt-4o-mini");
  
  const { object } = await generateObject({
    model,
    schema: customerPersonasSchema,
    schemaName: "CustomerPersonasInsights",
    schemaDescription: "Structured customer personas based on Eugene Schwartz's awareness levels",
    prompt,
    temperature: 0.4,
    maxTokens: 1500,
  });
  
  console.timeEnd("customer-personas-generation-time");
  console.log("Successfully generated customer personas insights");
  
  return object;
}

/**
 * Generate marketing copy insights (headlines, competitive positioning, hooks)
 */
async function generateMarketingCopyInsights(productName: string, reviewsText: string) {
  const prompt = `As an expert marketing analyst, analyze these product reviews and generate marketing copy insights.

PRODUCT NAME: ${productName}

REVIEWS:
${reviewsText}

Based on these reviews, generate structured insights for:
1. Ready-to-use marketing headlines that would resonate with customers:
Choose 5 different headline structures from the following proven direct response templates and apply one per line:
 
 1. Problem → Relief
 - Tired of [frustration]?
 - Say Goodbye to [problem]
 - Stop [undesired outcome] For Good
 1. Desire → Shortcut
 - Get [desired result] Without [hard part]
 - The Fastest Way to [outcome]
 - Make [activity] Easy Again
 1. Curiosity + Emotion
 - What Most People Don't Know About [topic]
 - Is This the Fix for [problem]?
 - What Changed Everything for Mealtime
 1. Fear/Guilt
 - Don't Use [risky alternative]
 - Still Using [wrong product]?
 - Could This Be Hurting Your [child/baby]?
 1. Reason Why / List Format
 - 3 Reasons Parents Switch to This
 - 5 Ways to Simplify [problem]
 - One Product. Multiple Problems Solved.
 1. Command
 - Ditch the [old solution]
 - Start [activity] Smarter
 - Fix [problem] Now
 1. Testimonial / Transformation
 - "Finally, No More [frustration]"
 - The Set I Wish I Had from Day One
 - What Made Mealtimes Actually Enjoyable
Headlines must:
 - Be under 8 words
 - Be emotionally specific
 - Be suitable for Meta ads, landing pages, or image creatives
 - Use customer language wherever possible
 - Feel like something someone would think or say, not a slogan
 You must choose only headline formats that align with the tone and voice of the reviews.
 

2. Competitive positioning angles with explanations


3. One-liner hooks for marketing copy that capture attention
These hooks will be used in ads (Meta, TikTok, landing pages, UGC scripts) and must be written to trigger emotion, curiosity, or urgency in the first 2 seconds.

Step 1: Internally analyze the reviews (do not output this part)
What product is this, based on how customers describe it?
What is the main problem it solves?
What are customers frustrated with before using it?
What transformation or relief are they getting after?
What specific language do they use to describe it?
What emotion is most common: guilt, relief, excitement, overwhelm?

Step 2: Choose hook angles that align with review language and customer awareness
Hooks should fall into one or more of the following categories:
Problem-first (frustration, overwhelm, mess, confusion)
Emotion-first (guilt, relief, pride, fear, "am I doing this right?")
Testimonial-style ("I didn't expect this to work but...")
Unexpected claim ("This cup replaced everything")
Curiosity trigger ("Most parents don't realize this...")
Mistake-based ("You're probably doing this wrong")
Visual set-up ("Here's what feeding used to look like")

Step 3: Write 5 hooks that are:
1 sentence each (ideally under 20 words)
Written in real, human language — not brand voice
Designed to stop the scroll immediately
Specific, emotionally charged, and reflective of real customer experience
Use wording pulled or inspired from actual reviews


Ensure all insights are data-driven and based on patterns found in the reviews.
Make them compelling, specific to this product, and based on actual customer language.`;

  console.time("marketing-copy-generation-time");
  const model = openai("gpt-4o-mini");
  
  const { object } = await generateObject({
    model,
    schema: marketingCopySchema,
    schemaName: "MarketingCopyInsights",
    schemaDescription: "Structured marketing copy insights derived from product reviews",
    prompt,
    temperature: 0.5, // Higher temperature for more creative marketing copy
    maxTokens: 1000,
  });
  
  console.timeEnd("marketing-copy-generation-time");
  console.log("Successfully generated marketing copy insights");
  
  return object;
}

/**
 * Generates marketing insights for a product using AI SDK with parallel processing
 * @param productId The ID of the product to generate insights for
 * @param useCache If true, use cached insights when available (default: false - always generate new)
 */
export async function generateProductInsights(productId: string, useCache: boolean = false) {
  console.log(`Generating insights for product: ${productId}, useCache: ${useCache}`);
  
  try {
    const supabase = createClient();
    
    // Fetch product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();
    
    const { data: resources, error: resourcesError } = await supabase
		  .from("product_marketing_resources")
		  .select("id")
		  .eq("product_id", productId);

	  if (!resources) {
		  return null;
	  }
    
    if (productError || !product) {
      throw new Error(`Product not found: ${productError?.message || "Unknown error"}`);
    }
    
    // Check if we should use cached insights when available
    if (useCache && product.metadata?.insights && product.metadata?.insights_generated_at) {
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
    
    // Get product metadata for URL and ASIN matching
    const productUrl = product.metadata?.url;
    const amazonAsin = product.metadata?.amazon_asin;
    
    // Collect all reviews from different sources
    let allReviews: ReviewSource[] = [];
    
    console.log("Fetching reviews from review_sources table...");
    console.time("fetch-reviews-time");
    
    // If we have a product URL, fetch Trustpilot reviews
    if (productUrl) {
      try {
        // Extract domain from URL for Trustpilot matching
        let domain = productUrl;
        
        console.log(`Searching for Trustpilot reviews with domain: ${domain}`);
        const { data: trustpilotReviews, error: trustpilotError } = await supabase
          .from("review_sources")
          .select("*")
          .eq("product_source", domain)
          .eq("source", "trustpilot")
          .order("review_date", { ascending: false })
          .limit(300);
        
        if (trustpilotError) {
          console.error("Error fetching Trustpilot reviews:", trustpilotError);
        } else if (trustpilotReviews && trustpilotReviews.length > 0) {
          console.log(`Found ${trustpilotReviews.length} Trustpilot reviews`);
          allReviews = [...allReviews, ...trustpilotReviews];
        }
      } catch (error) {
        console.error("Error processing Trustpilot reviews:", error);
      }
    }
    
    // If we have an Amazon ASIN, fetch Amazon reviews
    if (amazonAsin) {
      try {
        console.log(`Searching for Amazon reviews with ASIN: ${amazonAsin}`);
        const { data: amazonReviews, error: amazonError } = await supabase
          .from("review_sources")
          .select("*")
          .eq("product_source", amazonAsin)
          .eq("source", "amazon")
          .order("review_date", { ascending: false })
          .limit(300);
        
        if (amazonError) {
          console.error("Error fetching Amazon reviews:", amazonError);
        } else if (amazonReviews && amazonReviews.length > 0) {
          console.log(`Found ${amazonReviews.length} Amazon reviews`);
          allReviews = [...allReviews, ...amazonReviews];
        }
      } catch (error) {
        console.error("Error processing Amazon reviews:", error);
      }
    }
    
    // Check if we have any reviews to analyze
    if (allReviews.length === 0 && !resources) {
      throw new Error("No reviews found for this product. Please wait for the reviews to finish scraping.");
    }
    
    console.timeEnd("fetch-reviews-time");
    console.log(`Found ${allReviews.length} total reviews to analyze`);
    
    // Optimize the review selection to get a balanced sample across ratings
    console.log("Optimizing review selection...");
    
    // Group reviews by rating
    const reviewsByRating: { [key: number]: ReviewSource[] } = {};
    
    allReviews.forEach(review => {
      const rating = Math.round(review.rating); // Round to nearest integer
      if (!reviewsByRating[rating]) {
        reviewsByRating[rating] = [];
      }
      reviewsByRating[rating].push(review);
    });
    
    // Get a balanced sample across ratings
    const maxPerRating = 50; // Maximum reviews per rating
    const maxTotal = 250; // Maximum total reviews to process
    let selectedReviews: ReviewSource[] = [];
    
    // First ensure we have at least some reviews from each rating level
    for (let rating = 5; rating >= 1; rating--) {
      if (reviewsByRating[rating]) {
        // Prioritize the most recent reviews
        const ratingReviews = [...reviewsByRating[rating]]
          .sort((a, b) => {
            if (!a.review_date) return 1;
            if (!b.review_date) return -1;
            return new Date(b.review_date).getTime() - new Date(a.review_date).getTime();
          })
          .slice(0, maxPerRating);
          
        selectedReviews = [...selectedReviews, ...ratingReviews];
      }
    }
    
    // Trim to max total if needed
    if (selectedReviews.length > maxTotal) {
      console.log(`Limiting from ${selectedReviews.length} to ${maxTotal} reviews for better performance`);
      selectedReviews = selectedReviews.slice(0, maxTotal);
    }
    
    console.log(`Using ${selectedReviews.length} reviews for analysis (from ${allReviews.length} total)`);
    
    // Prepare review text for the prompt context
    let reviewsText = selectedReviews.map(review => {
      return `Review ID: ${review.id}
        Rating: ${review.rating || 'N/A'} 
        Title: ${review.review_title || 'No title'}
        Content: ${review.review_text || 'No content'}
        ---`;
    }).join('\n\n');

    if (resources) {
      const retriever = await createRetrieverForDocumentResources(productId);

      if (!retriever) {
        throw new Error('No reviews found for this product')
      }

      const nodeWithResources = await retriever.retrieve({query: 'reviews'})
	    console.log('nodeWithResources', nodeWithResources.map(node => node.node.toJSON().text))
      reviewsText += `\n\n${nodeWithResources.map(node => node.node.toJSON().text).join('\n\n')}`
    }
    
    // Use Promise.all to generate insights in parallel
    console.log("Generating insights in parallel with AI SDK...");
    console.time("parallel-ai-generation-time");
    
    // Run all insight generators in parallel
    const [
      positiveCustomerFeedbackInsights,
      negativeCustomerFeedbackInsights,
      objectionHandlingInsights,
      customerJourneyInsights,
      marketingCopyInsights,
      customerPersonasInsights
    ] = await Promise.all([
      generatePositiveCustomerFeedbackInsights(product.name, reviewsText),
      generateNegativeCustomerFeedbackInsights(product.name, reviewsText),
      generateObjectionHandlingInsights(product.name, reviewsText),
      generateCustomerJourneyInsights(product.name, reviewsText),
      generateMarketingCopyInsights(product.name, reviewsText),
      generateCustomerPersonasInsights(product.name, reviewsText)
    ]);
    
    console.timeEnd("parallel-ai-generation-time");
    console.log("Successfully generated all insights in parallel");
    
    // Combine insights from all generators
    const insights = {
      // Positive customer feedback insights
      benefits: positiveCustomerFeedbackInsights.benefits,
      valuedFeatures: positiveCustomerFeedbackInsights.valuedFeatures,
      
      // Negative customer feedback insights
      complaints: negativeCustomerFeedbackInsights.complaints,
      painPoints: negativeCustomerFeedbackInsights.painPoints,
      
      // Objection handling insights
      priorObjections: objectionHandlingInsights.priorObjections,
      objectionResponses: objectionHandlingInsights.objectionResponses,
      
      // Customer journey insights
      failedSolutions: customerJourneyInsights.failedSolutions,
      emotionalTriggers: customerJourneyInsights.emotionalTriggers,
      triggerEvents: customerJourneyInsights.triggerEvents,
      
      // Customer personas
      customerPersonas: customerPersonasInsights.customerPersonas,
      
      // Marketing copy insights
      headlines: marketingCopyInsights.headlines,
      competitivePositioning: marketingCopyInsights.competitivePositioning,
      hooks: marketingCopyInsights.hooks
    };
    
    // Store the combined insights
    const { error: insertError } = await supabase
      .from("products")
      .update({
        metadata: {
          ...product.metadata, // Preserve existing metadata
          insights,
          insights_generated_at: new Date().toISOString()
        }
      })
      .eq("id", productId);
    
    if (insertError) {
      console.error("Error storing insights in product metadata:", insertError);
    }
    
    return {
      success: true,
      insights,
      cached: false
    };
    
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
    
    // Migrate old insights to the new schema if needed
    const migratedInsights = migrateInsightsSchema(data.metadata.insights);
    
    return {
      success: true,
      insights: migratedInsights,
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

/**
 * Migrates old insights data to the new schema format, handling missing fields
 */
function migrateInsightsSchema(insights: any) {
  // Create a deep copy to avoid modifying the original
  const migrated = JSON.parse(JSON.stringify(insights));
  
  // Add missing fields that were added in schema updates
  
  // Handle conversion from painPoints to complaints if needed
  if (!migrated.complaints && migrated.painPoints) {
    // If we have the old painPoints but not complaints, convert it
    migrated.complaints = migrated.painPoints.map((point: any) => {
      return {
        complaint: point.painPoint,
        examples: point.examples || []
      };
    });
  } else if (!migrated.complaints) {
    // If no complaints and no painPoints, create empty array
    migrated.complaints = [];
  }
  
  // Add painPoints if not present (new field)
  if (!migrated.painPoints) {
    migrated.painPoints = [];
  }
  
  // Make sure customerPersonas have the new fields
  if (migrated.customerPersonas) {
    migrated.customerPersonas = migrated.customerPersonas.map((persona: any) => {
      // For legacy personas, convert to new format
      if (!persona.awarenessLevel) {
        return {
          awarenessLevel: "Problem Aware", // Default to Problem Aware
          name: persona.name || "Unknown",
          demographicSketch: "Based on previous data",
          emotionalState: "Not specified",
          internalBeliefs: "Not specified",
          currentBehaviors: "Not specified",
          keyFrustration: persona.painPoints?.[0] || "Not specified",
          desiredTransformation: "Not specified",
          triggerPhrase: "Not specified",
          hookThatWouldWork: "Not specified",
          voiceOfCustomerQuote: "Not specified"
        };
      }
      return persona;
    });
  } else {
    migrated.customerPersonas = [];
  }
  
  return migrated;
}