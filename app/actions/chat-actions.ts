"use server";

import { createClient } from "@/app/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Create a new chat session for a product
 */
export async function createChatSession({
  productId,
  sessionType = "general",
  title,
}: {
  productId: string;
  sessionType?: string;
  title?: string;
}) {
  try {
    const supabase = createClient();

    // Get the current user for authorization
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("You must be logged in to create a chat session");
    }

    // Get product info to use for title if not provided
    let chatTitle = title;
    if (!chatTitle) {
      const { data: product } = await supabase
        .from("products")
        .select("name")
        .eq("id", productId)
        .single();

      chatTitle = product?.name 
        ? `Chat about ${product.name}`
        : `New chat session`;
    }

    // Create the chat session
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        product_id: productId,
        session_type: sessionType,
        title: chatTitle,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating chat session:", error);
      throw new Error(`Failed to create chat session: ${error.message}`);
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Error in createChatSession:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a chat session by ID
 */
export async function getChatSession(sessionId: string) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from("chat_sessions")
      .select(`
        *,
        products:product_id (
          id,
          name,
          metadata
        )
      `)
      .eq("id", sessionId)
      .single();

    if (error) {
      console.error("Error fetching chat session:", error);
      throw new Error(`Failed to fetch chat session: ${error.message}`);
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Error in getChatSession:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get chat messages for a session
 */
export async function getChatMessages(sessionId: string) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching chat messages:", error);
      throw new Error(`Failed to fetch chat messages: ${error.message}`);
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error("Error in getChatMessages:", error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get chat sessions for a product
 */
export async function getProductChatSessions(productId: string) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("product_id", productId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching product chat sessions:", error);
      throw new Error(`Failed to fetch product chat sessions: ${error.message}`);
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error("Error in getProductChatSessions:", error);
    return { success: false, error: error.message, data: [] };
  }
}