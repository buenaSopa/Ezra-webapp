ALTER TABLE "review_sources" ALTER COLUMN "review_date" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "review_sources" ALTER COLUMN "review_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "review_sources" ADD COLUMN "review_date_timestamp" timestamp;