import { pgTable, uuid, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id),
  name: text("name").notNull(),
  description: text("description"),
  vectorDbIndexId: text("vector_db_index_id"),
  metadata: jsonb("metadata"), // Stores Amazon ASIN, Trustpilot URL, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relationship table to connect products with their competitors
export const productToCompetitors = pgTable("product_to_competitors", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  competitorProductId: uuid("competitor_product_id").notNull().references(() => products.id),
  relationshipType: text("relationship_type").notNull(), // 'direct_competitor', 'indirect_competitor', etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const productSources = pgTable("product_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  sourceType: text("source_type").notNull(), // 'trustpilot', 'amazon', 'pdf', etc.
  url: text("url"),
  filePath: text("file_path"),
  // Store reviews and their embeddings directly in JSON
  reviews: jsonb("reviews").default([]).notNull(), // Array of review objects with content, rating, etc.
  reviewVectorIds: jsonb("review_vector_ids").default([]).notNull(), // Array of vector DB IDs for each review
  lastScrapedAt: timestamp("last_scraped_at"),
  minimumScrapingInterval: integer("minimum_scraping_interval").default(24).notNull(), // minimum hours between scrapes
  status: text("status").notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  errorDetails: text("error_details"),
  metadata: jsonb("metadata"), // For any additional source-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productMarketingResources = pgTable("product_marketing_resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  resourceType: text("resource_type").notNull(), // 'brochure', 'whitepaper', 'presentation', 'case_study', etc.
  title: text("title").notNull(),
  description: text("description"),
  filePath: text("file_path"),
  url: text("url"),
  metadata: jsonb("metadata"), // For additional resource-specific data
  vectorDbIndexId: text("vector_db_index_id"), // For storing resource-specific embeddings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}); 