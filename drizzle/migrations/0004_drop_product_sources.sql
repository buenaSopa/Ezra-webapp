-- Drop the foreign key constraint first
ALTER TABLE "product_sources" DROP CONSTRAINT IF EXISTS "product_sources_product_id_products_id_fk";

-- Drop the table
DROP TABLE IF EXISTS "product_sources";

-- Add a comment to explain the migration
COMMENT ON SCHEMA public IS 'Removed unused product_sources table as metadata is stored in products.metadata JSONB field'; 