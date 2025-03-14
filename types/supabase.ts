export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          vector_db_index_id: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          vector_db_index_id?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          vector_db_index_id?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      product_to_competitors: {
        Row: {
          id: string
          product_id: string
          competitor_product_id: string
          relationship_type: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          competitor_product_id: string
          relationship_type: string
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          competitor_product_id?: string
          relationship_type?: string
          created_at?: string
        }
      }
      product_sources: {
        Row: {
          id: string
          product_id: string
          source_type: string
          url: string | null
          file_path: string | null
          reviews: Json
          review_vector_ids: Json
          last_scraped_at: string | null
          minimum_scraping_interval: number
          status: string
          error_details: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          source_type: string
          url?: string | null
          file_path?: string | null
          reviews?: Json
          review_vector_ids?: Json
          last_scraped_at?: string | null
          minimum_scraping_interval?: number
          status?: string
          error_details?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          source_type?: string
          url?: string | null
          file_path?: string | null
          reviews?: Json
          review_vector_ids?: Json
          last_scraped_at?: string | null
          minimum_scraping_interval?: number
          status?: string
          error_details?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      product_marketing_resources: {
        Row: {
          id: string
          product_id: string
          resource_type: string
          title: string
          description: string | null
          file_path: string | null
          url: string | null
          metadata: Json | null
          vector_db_index_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          resource_type: string
          title: string
          description?: string | null
          file_path?: string | null
          url?: string | null
          metadata?: Json | null
          vector_db_index_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          resource_type?: string
          title?: string
          description?: string | null
          file_path?: string | null
          url?: string | null
          metadata?: Json | null
          vector_db_index_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          website: string | null
        }
        Insert: {
          id: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 