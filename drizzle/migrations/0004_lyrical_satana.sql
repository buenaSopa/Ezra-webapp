ALTER TABLE "product_marketing_resources" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "description";