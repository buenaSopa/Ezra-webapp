import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id),
  name: text("name").notNull(),
  description: text("description"),
  vectorDbIndexId: text("vector_db_index_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productSources = pgTable("product_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  sourceType: text("source_type").notNull(), // 'trustpilot', 'amazon', 'pdf', etc.
  url: text("url"),
  filePath: text("file_path"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  status: text("status").notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
}); 