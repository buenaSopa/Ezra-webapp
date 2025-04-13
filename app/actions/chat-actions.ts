"use server";

import { createClient } from "@/app/utils/supabase/server";
import { OpenAI } from "llamaindex";
import { createChatEngine } from "@/lib/chat-engine";
import { productSummaryPrompt as internalPrimePrompt } from "@/lib/prompts/prompt";
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


export async function generateAndSaveProductSummary(productId: string) {
  
  try {
    const supabase = createClient();
    
    // First check if product already has a summary in metadata
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("metadata")
      .eq("id", productId)
      .single();
    
    if (productError) {
      console.error("Error fetching product:", productError);
      return { success: false, error: productError.message };
    }
    
    // If product already has a summary and it's not too old, return it
    if (product?.metadata?.summary && product?.metadata?.summary_generated_at) {
      const lastGenerated = new Date(product.metadata.summary_generated_at);
      const now = new Date();
      const daysSinceGeneration = Math.floor((now.getTime() - lastGenerated.getTime()) / (1000 * 60 * 60 * 24));
      
      // If summary was generated in the last 7 days, return it
      if (daysSinceGeneration < 7) {
        console.log(`Using existing summary from ${daysSinceGeneration} days ago`);
        return { success: true, summary: product.metadata.summary, cached: true };
      }
    }
    
    // Initialize LLM
    const llm = new OpenAI({
      model: "gpt-4o",
      temperature: 0.1,
    });
    
    // Create chat engine
    const chatEngine = await createChatEngine(llm, productId);
    
    // Get response from chat engine
    const response = await chatEngine.chat({
      message: internalPrimePrompt
    });
    
    const summary = response.response;
    
    // Save the summary to product metadata
    const { error: updateError } = await supabase
      .from("products")
      .update({
        metadata: {
          ...product.metadata, // Preserve existing metadata
          summary,
          summary_generated_at: new Date().toISOString()
        }
      })
      .eq("id", productId);
    
    if (updateError) {
      console.error("Error saving summary to product metadata:", updateError);
      return { success: false, error: updateError.message };
    }
    
    return { success: true, summary, cached: false };
  } catch (error: any) {
    console.error("Error generating product summary:", error);
    return { success: false, error: error.message || "Unknown error occurred" };
  }
}

/**
 * Update a chat session's title
 */
export async function updateChatSessionTitle({
  sessionId,
  title,
}: {
  sessionId: string;
  title: string;
}) {
  try {
    const supabase = createClient();

    // Get the current user for authorization
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("You must be logged in to update a chat session");
    }

    // Update the chat session title
    const { data, error } = await supabase
      .from("chat_sessions")
      .update({ 
        title,
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (error) {
      console.error("Error updating chat session title:", error);
      throw new Error(`Failed to update chat session: ${error.message}`);
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Error in updateChatSessionTitle:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a chat session and all its messages
 */
export async function deleteChatSession(sessionId: string) {
  try {
    const supabase = createClient();

    // Get the current user for authorization
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("You must be logged in to delete a chat session");
    }

    // First get the product ID so we can redirect back to it
    const { data: session, error: fetchError } = await supabase
      .from("chat_sessions")
      .select("product_id")
      .eq("id", sessionId)
      .single();

    if (fetchError) {
      console.error("Error fetching session:", fetchError);
      throw new Error(`Failed to fetch session: ${fetchError.message}`);
    }

    const productId = session.product_id;

    // Delete all chat messages for this session first
    const { error: messagesError } = await supabase
      .from("chat_messages")
      .delete()
      .eq("session_id", sessionId);

    if (messagesError) {
      console.error("Error deleting chat messages:", messagesError);
      throw new Error(`Failed to delete chat messages: ${messagesError.message}`);
    }

    // Then delete the chat session
    const { error: sessionError } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", sessionId);

    if (sessionError) {
      console.error("Error deleting chat session:", sessionError);
      throw new Error(`Failed to delete chat session: ${sessionError.message}`);
    }

    return { success: true, productId };
  } catch (error: any) {
    console.error("Error in deleteChatSession:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a chat session by ID
 */
export async function getChatSession(sessionId: string) {
  try {
    const supabase = createClient();
    
    // Get the current user for authorization
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("You must be logged in to access chat sessions");
    }
    
    // Fetch the chat session
    const { data: session, error: sessionError } = await supabase
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

    if (sessionError || !session) {
      console.error("Error fetching chat session:", sessionError);
      throw new Error(`Failed to fetch chat session: ${sessionError?.message || "Session not found"}`);
    }
    
    // Verify the product belongs to the current user
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("id", session.product_id)
      .eq("user_id", user.id)
      .single();
      
    if (productError || !product) {
      console.error("Error verifying product ownership:", productError);
      throw new Error("Unauthorized access to this chat session");
    }

    return { success: true, data: session };
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
    
    // Get the current user for authorization
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("You must be logged in to access chat messages");
    }
    
    // First verify the chat session exists
    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("product_id")
      .eq("id", sessionId)
      .single();
    
    if (sessionError || !session) {
      console.error("Error fetching chat session:", sessionError);
      throw new Error("Chat session not found");
    }
    
    // Verify the product belongs to the current user
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("id", session.product_id)
      .eq("user_id", user.id)
      .single();
      
    if (productError || !product) {
      console.error("Error verifying product ownership:", productError);
      throw new Error("Unauthorized access to these chat messages");
    }
    
    // Now fetch the chat messages
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
    
    // Get the current user for authorization
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("You must be logged in to fetch chat sessions");
    }
    
    // First verify the product belongs to the current user
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .eq("user_id", user.id)
      .single();
    
    if (productError || !product) {
      console.error("Error fetching product or unauthorized access:", productError);
      throw new Error("Unauthorized access to product");
    }
    
    // Then fetch the chat sessions for this product
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

/**
 * Save a chat message to the database
 */
export async function saveChatMessage({
  sessionId,
  role,
  content,
  metadata
}: {
  sessionId: string;
  role: string;
  content: string;
  metadata?: any;
}) {
  try {
    console.log(`[saveChatMessage] Saving ${role} message for session ${sessionId}`, { contentLength: content.length, hasMetadata: !!metadata });
    
    const supabase = createClient();
    
    // Get the current user for authorization
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log("[saveChatMessage] Error: User not logged in");
      throw new Error("You must be logged in to save chat messages");
    }
    
    // Save the message to the database
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        role,
        content,
        metadata
      })
      .select()
      .single();
      
    if (error) {
      console.error("[saveChatMessage] Database error:", error);
      throw new Error(`Failed to save chat message: ${error.message}`);
    }
    
    console.log(`[saveChatMessage] Successfully saved ${role} message with ID: ${data.id}`);
    return { success: true, data };
  } catch (error: any) {
    console.error("[saveChatMessage] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update chat session's timestamp to reflect latest activity
 */
export async function updateChatSessionTimestamp(sessionId: string) {
  try {
    console.log(`[updateChatSessionTimestamp] Updating timestamp for session ${sessionId}`);
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from("chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .select();
      
    if (error) {
      console.error("[updateChatSessionTimestamp] Error:", error);
    } else {
      console.log("[updateChatSessionTimestamp] Successfully updated timestamp");
    }
    
    return { success: !error, error: error?.message };
  } catch (error: any) {
    console.error("[updateChatSessionTimestamp] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all chat sessions for the current user
 */
export async function getUserChatSessions() {
  try {
    const supabase = createClient();
    
    // Get the current user for authorization
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("You must be logged in to fetch chat sessions");
    }
    
    // First, get all products owned by the current user
    const { data: userProducts, error: productsError } = await supabase
      .from("products")
      .select("id")
      .eq("user_id", user.id);
      
    if (productsError) {
      console.error("Error fetching user products:", productsError);
      throw new Error(`Failed to fetch user products: ${productsError.message}`);
    }
    
    // Extract product IDs
    const productIds = userProducts?.map(product => product.id) || [];
    
    if (productIds.length === 0) {
      // User has no products
      return { success: true, data: [] };
    }
    
    // Get all chat sessions for the user's products
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
      .in("product_id", productIds)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching user chat sessions:", error);
      throw new Error(`Failed to fetch user chat sessions: ${error.message}`);
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error("Error in getUserChatSessions:", error);
    return { success: false, error: error.message, data: [] };
  }
}
