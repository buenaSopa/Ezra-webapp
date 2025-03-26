import { pgTable, uuid, text, timestamp, jsonb, real, boolean, date } from "drizzle-orm/pg-core";
import { products } from "./products";

export const reviewSources = pgTable("review_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  productSource: text("product_source").notNull(), // URL for Trustpilot or ASIN for Amazon
  source: text("source").notNull(), // 'trustpilot', 'amazon', etc.
  sourceId: text("source_id").notNull(), // Original ID from the source platform
  reviewText: text("review_text").notNull(), // Main review content
  reviewTitle: text("review_title"), // Review title/heading
  rating: real("rating").notNull(), // Normalized 1-5 scale
  reviewDate: date("review_date"), // Changed to proper date type (YYYY-MM-DD)
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
  productSourceIdx: {
    name: "review_sources_product_source_idx",
    columns: ["product_source", "source"], // Include source to distinguish between URL/ASIN
  },
  reviewDateIdx: {
    name: "review_sources_review_date_idx",
    columns: ["review_date"],
  },
}; 