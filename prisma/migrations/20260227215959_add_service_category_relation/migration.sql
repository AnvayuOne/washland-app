-- Create service categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS "service_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- Ensure unique category names
CREATE UNIQUE INDEX IF NOT EXISTS "service_categories_name_key" ON "service_categories"("name");

-- Add relation column on services
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

-- Backfill categories from legacy text column
INSERT INTO "service_categories" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT
  'cat_' || substr(md5(lower(trim("category"))), 1, 24) AS "id",
  trim("category") AS "name",
  NULL AS "description",
  true AS "isActive",
  CURRENT_TIMESTAMP AS "createdAt",
  CURRENT_TIMESTAMP AS "updatedAt"
FROM "services"
WHERE "category" IS NOT NULL
  AND trim("category") <> ''
ON CONFLICT ("name") DO NOTHING;

-- Link existing services to backfilled categories
UPDATE "services" s
SET "categoryId" = sc."id"
FROM "service_categories" sc
WHERE s."categoryId" IS NULL
  AND s."category" IS NOT NULL
  AND lower(trim(s."category")) = lower(trim(sc."name"));

-- Add index for relation lookups
CREATE INDEX IF NOT EXISTS "services_categoryId_idx" ON "services"("categoryId");

-- Add FK once
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'services_categoryId_fkey'
  ) THEN
    ALTER TABLE "services"
    ADD CONSTRAINT "services_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
