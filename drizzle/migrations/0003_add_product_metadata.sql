-- Add metadata column to products table
ALTER TABLE "products" ADD COLUMN "metadata" jsonb;

-- Add comment explaining the purpose of the metadata column
COMMENT ON COLUMN "products"."metadata" IS 'Stores additional product data like Amazon ASIN, Trustpilot URL, etc.';

-- Update existing products to have an empty metadata object
UPDATE "products" SET "metadata" = '{}'::jsonb WHERE "metadata" IS NULL; 