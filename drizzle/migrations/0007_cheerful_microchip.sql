-- First, drop the review_date_timestamp column as it's no longer needed
ALTER TABLE "review_sources" DROP COLUMN IF EXISTS "review_date_timestamp";

-- Add a temporary column for the new date format
ALTER TABLE "review_sources" ADD COLUMN "review_date_new" date;

-- Update the temp column with converted dates where possible using a custom conversion function
-- This will handle the specific date formats we have
UPDATE "review_sources" SET "review_date_new" = 
  CASE 
    -- Handle Trustpilot format: "Friday, March 22, 2024 at 01:22:45 PM"
    WHEN "source" = 'trustpilot' AND "review_date" ~ '[A-Za-z]+, ([A-Za-z]+ [0-9]+, [0-9]+)' THEN 
      TO_DATE(SUBSTRING("review_date" FROM '[A-Za-z]+, ([A-Za-z]+ [0-9]+, [0-9]+)'), 'Month DD, YYYY')
    -- Handle Amazon format: "March 19, 2025"
    WHEN "source" = 'amazon' THEN 
      TO_DATE("review_date", 'Month DD, YYYY')
    ELSE NULL
  END;

-- Drop the old column
ALTER TABLE "review_sources" DROP COLUMN "review_date";

-- Rename the new column to the original name
ALTER TABLE "review_sources" RENAME COLUMN "review_date_new" TO "review_date";

-- Create the updated index on the new column
CREATE INDEX IF NOT EXISTS "review_sources_review_date_idx" ON "review_sources" ("review_date");