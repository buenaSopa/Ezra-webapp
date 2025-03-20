import { pgTable, uuid, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.userId),
  name: text("name").notNull(),
  vectorDbIndexId: text("vector_db_index_id"),
  metadata: jsonb("metadata"), // Stores Amazon ASIN, Trustpilot URL, etc.
  lastReviewsScrapedAt: timestamp("last_reviews_scraped_at"),
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