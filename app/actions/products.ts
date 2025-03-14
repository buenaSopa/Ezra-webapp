"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { products, productToCompetitors, productMarketingResources } from "@/schema/products"
import { v4 as uuidv4 } from "uuid"

// Types for the action parameters
type Competitor = {
  name: string
  url: string
  amazonAsin?: string
  trustpilotUrl?: string
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
  trustpilotUrl?: string
  competitors: Competitor[]
  resources: Resource[]
}

export async function createProduct({
  name,
  url,
  amazonAsin,
  trustpilotUrl,
  competitors,
  resources,
}: CreateProductParams) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
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
          amazon_asin: amazonAsin,
          trustpilot_url: trustpilotUrl
        }
      })
      .select()
      .single()
    
    if (productError) {
      throw new Error(`Error creating product: ${productError.message}`)
    }
    
    const productId = productData.id
    
    // Process competitors
    if (competitors.length > 0) {
      // First, create competitor products
      for (const competitor of competitors) {
        // Create competitor as a product
        const { data: competitorData, error: competitorError } = await supabase
          .from("products")
          .insert({
            name: competitor.name,
            user_id: user.id,
            metadata: {
              amazon_asin: competitor.amazonAsin,
              trustpilot_url: competitor.trustpilotUrl
            }
          })
          .select()
          .single()
        
        if (competitorError) {
          console.error(`Error creating competitor: ${competitorError.message}`)
          continue
        }
        
        // Create relationship
        const { error: relationError } = await supabase
          .from("product_to_competitors")
          .insert({
            product_id: productId,
            competitor_product_id: competitorData.id,
            relationship_type: "direct_competitor",
          })
        
        if (relationError) {
          console.error(`Error creating competitor relationship: ${relationError.message}`)
        }
      }
    }
    
    // Process resources
    if (resources.length > 0) {
      const resourcesToInsert = resources.map(resource => ({
        product_id: productId,
        resource_type: resource.type,
        title: resource.title,
        url: resource.url || null,
      }))
      
      const { error: resourcesError } = await supabase
        .from("product_marketing_resources")
        .insert(resourcesToInsert)
      
      if (resourcesError) {
        console.error(`Error creating marketing resources: ${resourcesError.message}`)
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
export async function uploadMarketingResourceFile(productId: string, resourceId: string, file: File) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error("User not authenticated")
    }
    
    // Generate a unique file path
    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/${productId}/${resourceId}.${fileExt}`
    
    // Upload the file to Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from('marketing-resources')
      .upload(filePath, file)
    
    if (uploadError) {
      throw new Error(`Error uploading file: ${uploadError.message}`)
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('marketing-resources')
      .getPublicUrl(filePath)
    
    // Update the marketing resource with the file path
    const { error: updateError } = await supabase
      .from("product_marketing_resources")
      .update({
        file_path: filePath,
      })
      .eq("id", resourceId)
    
    if (updateError) {
      throw new Error(`Error updating resource: ${updateError.message}`)
    }
    
    return { success: true, publicUrl }
  } catch (error) {
    console.error("Error in uploadMarketingResourceFile:", error)
    return { success: false, error: (error as Error).message }
  }
} 