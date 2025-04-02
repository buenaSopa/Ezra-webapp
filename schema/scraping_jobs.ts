import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { products } from "./products";

// Define status enum for scraping jobs
export const scrapingJobStatusEnum = pgEnum('scraping_job_status', [
  'queued',
  'running',
  'completed',
  'failed',
  'indexing',
  'indexed',
  'index_failed'
]);

// Define source enum for scraping jobs
export const scrapingSourceEnum = pgEnum('scraping_source', [
  'amazon',
  'trustpilot'
]);

// Define the scraping_jobs table
export const scrapingJobs = pgTable("scraping_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  source: scrapingSourceEnum("source").notNull(), // 'amazon' or 'trustpilot'
  status: scrapingJobStatusEnum("status").notNull().default('queued'),
  sourceIdentifier: text("source_identifier").notNull(), // domain or ASIN
  actorRunId: text("actor_run_id"), // Apify run ID
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"), // Nullable, filled when job completes
  indexedAt: timestamp("indexed_at"), // Nullable, filled when reviews are indexed
  errorMessage: text("error_message"), // Nullable, filled on failure
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Create indexes for efficient lookups
export const scrapingJobsIndexes = {
  productIdIdx: {
    name: "scraping_jobs_product_id_idx",
    columns: ["product_id"],
  },
  statusIdx: {
    name: "scraping_jobs_status_idx",
    columns: ["status"],
  },
  sourceIdentifierIdx: {
    name: "scraping_jobs_source_identifier_idx",
    columns: ["source_identifier"],
  },
  actorRunIdIdx: {
    name: "scraping_jobs_actor_run_id_idx",
    columns: ["actor_run_id"],
    unique: true,
  },
}; 