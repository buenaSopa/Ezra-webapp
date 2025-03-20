import { pgTable, uuid, text, timestamp, jsonb, real, boolean } from "drizzle-orm/pg-core";
import { products } from "./products";

export const reviewSources = pgTable("review_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  source: text("source").notNull(), // 'trustpilot', 'amazon', etc.
  sourceId: text("source_id").notNull(), // Original ID from the source platform
  reviewText: text("review_text").notNull(), // Main review content
  reviewTitle: text("review_title"), // Review title/heading
  rating: real("rating").notNull(), // Normalized 1-5 scale
  reviewDate: timestamp("review_date").notNull(), // When the review was posted
  reviewerName: text("reviewer_name"), // Name of the reviewer
  verified: boolean("verified").default(false), // Whether the review is verified
  sourceData: jsonb("source_data").notNull(), // Complete original review data
  createdAt: timestamp("created_at").defaultNow(),
});

// Create a unique constraint to prevent duplicate reviews
// This helps with the upsert operations during scraping
export const reviewSourcesIndexes = {
  sourceIdIdx: {
    name: "review_sources_source_source_id_idx",
    columns: ["source", "source_id"],
    unique: true,
  },
  productIdIdx: {
    name: "review_sources_product_id_idx",
    columns: ["product_id"],
  },
  reviewDateIdx: {
    name: "review_sources_review_date_idx",
    columns: ["review_date"],
  },
}; 