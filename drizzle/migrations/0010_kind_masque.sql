ALTER TABLE "review_sources" DROP CONSTRAINT "review_sources_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "review_sources" ADD COLUMN "product_source" text NOT NULL;--> statement-breakpoint
ALTER TABLE "review_sources" DROP COLUMN IF EXISTS "product_id";