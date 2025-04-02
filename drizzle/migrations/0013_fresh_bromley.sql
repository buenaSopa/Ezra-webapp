ALTER TYPE "scraping_job_status" ADD VALUE 'indexing';--> statement-breakpoint
ALTER TYPE "scraping_job_status" ADD VALUE 'indexed';--> statement-breakpoint
ALTER TYPE "scraping_job_status" ADD VALUE 'index_failed';--> statement-breakpoint
ALTER TABLE "scraping_jobs" ADD COLUMN "indexed_at" timestamp;