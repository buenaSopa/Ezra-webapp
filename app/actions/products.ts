"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createClient } from "@/app/utils/supabase/server"
import { products, productToCompetitors, productMarketingResources } from "@/schema/products"
import { v4 as uuidv4 } from "uuid"

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
    
    // Revalidate the products path to update the UI
    revalidatePath("/products")
    
    return { success: true, productId }
  } catch (error) {
    console.error("Error in createProduct:", error)
    return { success: false, error: (error as Error).message }
  }
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