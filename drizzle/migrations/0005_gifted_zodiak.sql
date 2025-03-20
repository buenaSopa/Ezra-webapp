CREATE TABLE IF NOT EXISTS "review_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"source" text NOT NULL,
	"source_id" text NOT NULL,
	"review_text" text NOT NULL,
	"review_title" text,
	"rating" real NOT NULL,
	"review_date" timestamp NOT NULL,
	"reviewer_name" text,
	"verified" boolean DEFAULT false,
	"source_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "last_reviews_scraped_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_sources" ADD CONSTRAINT "review_sources_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
