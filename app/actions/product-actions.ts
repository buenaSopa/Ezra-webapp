"use server";

import { createClient } from "@/app/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  
  // Delete any other related data (if you have any)
  // For example, if you have product reviews:
  // const { error: reviewsError } = await supabase
  //   .from("reviews")
  //   .delete()
  //   .eq("product_id", productId);
  // 
  // if (reviewsError) {
  //   console.error("Error deleting product reviews:", reviewsError);
  //   throw new Error(`Failed to delete product reviews: ${reviewsError.message}`);
  // }
  
  // Delete any product images from storage (if you have any)
  // const { error: storageError } = await supabase
  //   .storage
  //   .from('product-images')
  //   .remove([`${productId}/`]);
  // 
  // if (storageError) {
  //   console.error("Error deleting product images:", storageError);
  //   throw new Error(`Failed to delete product images: ${storageError.message}`);
  // }
  
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

/**
 * Create a new product
 */
export async function createProduct(formData: FormData) {
  const supabase = createClient();
  
  // Get form data
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const url = formData.get('url') as string;
  
  if (!name) {
    throw new Error("Product name is required");
  }
  
  // Insert the new product
  const { data, error } = await supabase
    .from("products")
    .insert({
      name,
      metadata: {
        description,
        url
      }
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error creating product:", error);
    throw new Error(`Failed to create product: ${error.message}`);
  }
  
  // Revalidate the products page to reflect the changes
  revalidatePath('/products');
  
  // Redirect to the product page
  redirect(`/products/${data.id}`);
}

/**
 * Update an existing product
 */
export async function updateProduct(productId: string, formData: FormData) {
  const supabase = createClient();
  
  // Get form data
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const url = formData.get('url') as string;
  
  if (!name) {
    throw new Error("Product name is required");
  }
  
  // Update the product
  const { error } = await supabase
    .from("products")
    .update({
      name,
      metadata: {
        description,
        url
      }
    })
    .eq('id', productId);
  
  if (error) {
    console.error("Error updating product:", error);
    throw new Error(`Failed to update product: ${error.message}`);
  }
  
  // Revalidate the products page to reflect the changes
  revalidatePath('/products');
  revalidatePath(`/products/${productId}`);
  
  // Redirect to the product page
  redirect(`/products/${productId}`);
} 