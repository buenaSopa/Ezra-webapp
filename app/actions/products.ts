"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createClient } from "@/app/utils/supabase/server"
import { products, productToCompetitors, productMarketingResources } from "@/schema/products"
import { v4 as uuidv4 } from "uuid"
import { getAmazonReviews } from "@/app/actions/amazon"
import { startTrustpilotReviewScraping } from "@/app/actions/trustpilot"

// Types for the action parameters
type Competitor = {
  name: string
  url: string
  amazonAsin?: string
}

type Resource = {
  type: string
  title: string
  url?: string
}

type CreateProductParams = {
  name: string
  url: string
  amazonAsin?: string
  competitors: Competitor[]
  resources: Resource[]
}

export async function createProduct({
  name,
  url,
  amazonAsin,
  competitors,
  resources,
}: CreateProductParams) {
  try {
    // Log the incoming data for debugging
    console.log('Creating product with data:', JSON.stringify({
      name,
      url,
      amazonAsin,
      competitors,
      resources
    }, null, 2));
    
    const cookieStore = cookies()
    const supabase = createClient()
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error("User not authenticated")
    }
    
    // Create the product
    const { data: productData, error: productError } = await supabase
      .from("products")
      .insert({
        name,
        user_id: user.id,
        metadata: {
          url,
          amazon_asin: amazonAsin,
          is_competitor: false
        }
      })
      .select()
      .single()
    
    if (productError) {
      console.error("Error creating product:", productError);
      throw new Error(`Error creating product: ${productError.message}`)
    }
    
    console.log('Product created successfully:', productData);
    const productId = productData.id
    
    // Process competitors
    if (competitors.length > 0) {
      console.log(`Processing ${competitors.length} competitors...`);
      
      // First, create competitor products
      for (const competitor of competitors) {
        console.log('Creating competitor:', competitor);
        
        // Create competitor as a product
        const { data: competitorData, error: competitorError } = await supabase
          .from("products")
          .insert({
            name: competitor.name,
            user_id: user.id,
            metadata: {
              url: competitor.url,
              amazon_asin: competitor.amazonAsin,
              is_competitor: true,
              competitor_for: productId
            }
          })
          .select()
          .single()
        
        if (competitorError) {
          console.error(`Error creating competitor ${competitor.name}:`, competitorError);
          continue
        }
        
        console.log(`Competitor ${competitor.name} created:`, competitorData);
        
        // Create relationship
        const { error: relationError } = await supabase
          .from("product_to_competitors")
          .insert({
            product_id: productId,
            competitor_product_id: competitorData.id,
            relationship_type: "direct_competitor",
          })
        
        if (relationError) {
          console.error(`Error creating competitor relationship for ${competitor.name}:`, relationError);
        } else {
          console.log(`Relationship created between product ${productId} and competitor ${competitorData.id}`);
        }
      }
    }
    
    // Process resources
    if (resources.length > 0) {
      console.log(`Processing ${resources.length} resources...`);
      
      const resourcesToInsert = resources.map(resource => ({
        product_id: productId,
        resource_type: resource.type,
        title: resource.title,
        url: resource.url || null,
      }))
      
      console.log('Resources to insert:', resourcesToInsert);
      
      const { data: insertedResources, error: resourcesError } = await supabase
        .from("product_marketing_resources")
        .insert(resourcesToInsert)
        .select()
      
      if (resourcesError) {
        console.error("Error creating marketing resources:", resourcesError);
      } else {
        console.log('Resources created successfully:', insertedResources);
      }
    }
    
    // --- Start: Trigger asynchronous review scraping ---
    console.log(`Triggering background review scraping for product ${productId}...`);
    try {
      // Check if reviews already exist before triggering scrapes
      const checkExistingReviews = async (source: 'trustpilot' | 'amazon', sourceValue: string) => {
        try {
          // For Trustpilot, try to extract domain
          let valueToCheck = sourceValue;
          
          // Check for existing reviews
          const { count, error } = await supabase
            .from("review_sources")
            .select("id", { count: 'exact', head: true })
            .eq("product_source", valueToCheck)
            .eq("source", source)
            .limit(1);
          
          if (error) {
            console.error(`Error checking for existing ${source} reviews:`, error);
            return false;
          }
          
          return count !== null && count > 0;
        } catch (error) {
          console.error(`Error in checkExistingReviews for ${source}:`, error);
          return false;
        }
      };

      // Trigger Amazon scrape if ASIN exists
      if (amazonAsin && amazonAsin.trim()) {
        const asin = amazonAsin.trim();
        // First check if reviews already exist
        const hasAmazonReviews = await checkExistingReviews('amazon', asin);
        
        if (!hasAmazonReviews) {
          console.log(` -> Triggering Amazon scrape for ASIN: ${asin} (no existing reviews)`);
          // Intentionally not awaited - fire and forget
          getAmazonReviews(asin, productId);
        } else {
          console.log(` -> Skipping Amazon scrape for ASIN: ${asin} (reviews already exist)`);
        }
      } else {
        console.log(" -> Skipping Amazon scrape (no ASIN provided).");
      }

      // Trigger Trustpilot scrape if URL exists
      if (url && url.trim()) {
        const cleanUrl = url.trim();
        // First check if reviews already exist
        const hasTrustpilotReviews = await checkExistingReviews('trustpilot', cleanUrl);
        
        if (!hasTrustpilotReviews) {
          console.log(` -> Triggering Trustpilot scrape for URL: ${cleanUrl} (no existing reviews)`);
          // Intentionally not awaited - fire and forget
          startTrustpilotReviewScraping(cleanUrl, productId);
        } else {
          console.log(` -> Skipping Trustpilot scrape for URL: ${cleanUrl} (reviews already exist)`);
        }
      } else {
        console.log(" -> Skipping Trustpilot scrape (no URL provided).");
      }
      console.log("Background scraping tasks initiated.");
    } catch (scrapeError) {
      // Log the error but don't fail the product creation process
      console.error("Error initiating background scraping tasks:", scrapeError);
    }
    
    // Revalidate the products path to update the UI
    revalidatePath("/products")
    
    return { success: true, productId }
  } catch (error) {
    console.error("Error in createProduct:", error)
    return { success: false, error: (error as Error).message }
  }
}


/**
 * Delete a product and all its related data
 * This is a server action that handles the complete deletion process
 */
export async function deleteProduct(productId: string) {
  const supabase = createClient();
  
  // Get the current user for authorization
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("You must be logged in to delete a product");
  }
  
  // Start a transaction by using multiple operations
  // First, check if the product exists
  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("id, name")
    .eq("id", productId)
    .single();
  
  if (fetchError) {
    console.error("Error fetching product:", fetchError);
    throw new Error(`Product not found: ${fetchError.message}`);
  }
  
  // Get all chat sessions for this product
  const { data: chatSessions, error: sessionsError } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("product_id", productId);
    
  if (sessionsError) {
    console.error("Error fetching chat sessions:", sessionsError);
    throw new Error(`Failed to fetch chat sessions: ${sessionsError.message}`);
  }
  
  console.log(`Found ${chatSessions?.length || 0} chat sessions to delete for product ${productId}`);
  
  // Delete all chat messages for each session
  if (chatSessions && chatSessions.length > 0) {
    for (const session of chatSessions) {
      console.log(`Deleting chat messages for session ${session.id}`);
      const { error: messagesError } = await supabase
        .from("chat_messages")
        .delete()
        .eq("session_id", session.id);
        
      if (messagesError) {
        console.error(`Error deleting chat messages for session ${session.id}:`, messagesError);
        throw new Error(`Failed to delete chat messages: ${messagesError.message}`);
      }
    }
    
    // Delete all chat sessions for this product
    console.log(`Deleting ${chatSessions.length} chat sessions for product ${productId}`);
    const { error: deleteSessionsError } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("product_id", productId);
      
    if (deleteSessionsError) {
      console.error("Error deleting chat sessions:", deleteSessionsError);
      throw new Error(`Failed to delete chat sessions: ${deleteSessionsError.message}`);
    }
  }
  
  // Delete related competitor relationships
  const { error: competitorsError } = await supabase
    .from("product_to_competitors")
    .delete()
    .eq("competitor_product_id", productId);
  
  if (competitorsError) {
    console.error("Error deleting product competitor relationships:", competitorsError);
    throw new Error(`Failed to delete product competitor relationships: ${competitorsError.message}`);
  }
  
  // Also check for the reverse relationship where this product is a competitor to other products
  const { error: reverseCompetitorsError } = await supabase
    .from("product_to_competitors")
    .delete()
    .eq("product_id", productId);
  
  if (reverseCompetitorsError) {
    console.error("Error deleting reverse competitor relationships:", reverseCompetitorsError);
    throw new Error(`Failed to delete reverse competitor relationships: ${reverseCompetitorsError.message}`);
  }
  
  // Delete related marketing resources
  const { error: marketingResourcesError } = await supabase
    .from("product_marketing_resources")
    .delete()
    .eq("product_id", productId);
  
  if (marketingResourcesError) {
    console.error("Error deleting product marketing resources:", marketingResourcesError);
    throw new Error(`Failed to delete product marketing resources: ${marketingResourcesError.message}`);
  }
  
  // Delete related scraping jobs
  const { error: scrapingJobsError } = await supabase
    .from("scraping_jobs")
    .delete()
    .eq("product_id", productId);
  
  if (scrapingJobsError) {
    console.error("Error deleting scraping jobs:", scrapingJobsError);
    throw new Error(`Failed to delete scraping jobs: ${scrapingJobsError.message}`);
  }
  
  // Finally delete the product itself
  const { error: deleteError } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);
  
  if (deleteError) {
    console.error("Error deleting product:", deleteError);
    throw new Error(`Failed to delete product: ${deleteError.message}`);
  }
  
  // Revalidate the products page to reflect the changes
  revalidatePath('/products');
  
  // Return success
  return { success: true };
}

// Function to handle file uploads for marketing resources
export async function uploadMarketingResourceFile(
  productId: string, 
  resourceId: string, 
  fileName: string,
  fileType: string,
  fileBase64: string
) {
  try {
    console.log(`Uploading file for product ${productId}, resource ${resourceId}:`, fileName);
    console.log(`File type: ${fileType}`);
    
    const cookieStore = cookies()
    const supabase = createClient()
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error("User not authenticated for file upload");
      throw new Error("User not authenticated")
    }
    
    // Generate a unique file path
    const fileExt = fileName.split('.').pop()
    const filePath = `${user.id}/${productId}/${resourceId}.${fileExt}`
    
    console.log(`File will be uploaded to path: ${filePath}`);
    console.log(`Using storage bucket: marketing-resources`);
    
    // Convert base64 string to buffer
    const base64Data = fileBase64.split(',')[1] || fileBase64;
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Upload the file to Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from('marketing-resources')
      .upload(filePath, buffer, {
        contentType: fileType
      })
    
    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      console.error("Error details:", JSON.stringify(uploadError));
      throw new Error(`Error uploading file: ${uploadError.message}`)
    }
    
    console.log('File uploaded successfully to Supabase storage');
    
    // Get the public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('marketing-resources')
      .getPublicUrl(filePath)
    
    console.log(`Public URL for file: ${publicUrl}`);
    
    // Create a new marketing resource entry
    const { data: resourceData, error: createError } = await supabase
      .from("product_marketing_resources")
      .insert({
        id: resourceId,
        product_id: productId,
        resource_type: 'document',
        title: fileName,
        file_path: filePath,
      })
      .select()
    
    if (createError) {
      console.error("Error creating resource record:", createError);
      console.error("Error details:", JSON.stringify(createError));
      throw new Error(`Error creating resource: ${createError.message}`)
    }
    
    console.log('Resource record created successfully:', resourceData);
    
    return { success: true, publicUrl }
  } catch (error) {
    console.error("Error in uploadMarketingResourceFile:", error)
    return { success: false, error: (error as Error).message }
  }
}