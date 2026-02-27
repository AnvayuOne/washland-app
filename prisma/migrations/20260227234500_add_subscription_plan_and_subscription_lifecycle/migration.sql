DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionPlanType') THEN
    CREATE TYPE "SubscriptionPlanType" AS ENUM ('PREMIUM_CARE', 'RECURRING_LINENS', 'CUSTOM');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingCycle') THEN
    CREATE TYPE "BillingCycle" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');
  END IF;
END $$;

ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_PENDING';

ALTER TABLE "subscription_plans"
  ADD COLUMN IF NOT EXISTS "planType" "SubscriptionPlanType" NOT NULL DEFAULT 'CUSTOM',
  ADD COLUMN IF NOT EXISTS "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS "price" DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS "benefitsJson" JSONB,
  ADD COLUMN IF NOT EXISTS "storeId" TEXT;

UPDATE "subscription_plans"
SET "price" = "monthlyPrice"
WHERE "price" IS NULL;

ALTER TABLE "subscription_plans"
  ALTER COLUMN "price" SET NOT NULL;

ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "monthlyPrice";
ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "discountRate";
ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "maxOrders";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plans_storeId_fkey'
  ) THEN
    ALTER TABLE "subscription_plans"
      ADD CONSTRAINT "subscription_plans_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "subscription_plans_isActive_idx" ON "subscription_plans"("isActive");
CREATE INDEX IF NOT EXISTS "subscription_plans_storeId_isActive_idx" ON "subscription_plans"("storeId", "isActive");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'startDate'
  ) THEN
    ALTER TABLE "subscriptions" RENAME COLUMN "startDate" TO "startAt";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'endDate'
  ) THEN
    ALTER TABLE "subscriptions" RENAME COLUMN "endDate" TO "endAt";
  END IF;
END $$;

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "storeId" TEXT,
  ADD COLUMN IF NOT EXISTS "renewAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "autoRenew" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "startAt" TIMESTAMP(3);

UPDATE "subscriptions"
SET "startAt" = COALESCE("startAt", CURRENT_TIMESTAMP);

ALTER TABLE "subscriptions"
  ALTER COLUMN "startAt" SET NOT NULL;

UPDATE "subscriptions" s
SET "storeId" = sp."storeId"
FROM "subscription_plans" sp
WHERE s."planId" = sp."id"
  AND s."storeId" IS NULL
  AND sp."storeId" IS NOT NULL;

DO $$
DECLARE
  fallback_store_id TEXT;
BEGIN
  SELECT "id" INTO fallback_store_id FROM "stores" ORDER BY "createdAt" ASC LIMIT 1;
  IF fallback_store_id IS NOT NULL THEN
    UPDATE "subscriptions"
    SET "storeId" = fallback_store_id
    WHERE "storeId" IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM "subscriptions" WHERE "storeId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot backfill subscriptions.storeId because no store is available';
  END IF;
END $$;

ALTER TABLE "subscriptions"
  ALTER COLUMN "storeId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_storeId_fkey'
  ) THEN
    ALTER TABLE "subscriptions"
      ADD CONSTRAINT "subscriptions_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DROP INDEX IF EXISTS "subscriptions_stripeSubscriptionId_key";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "stripeSubscriptionId";

CREATE INDEX IF NOT EXISTS "subscriptions_userId_status_idx" ON "subscriptions"("userId", "status");
CREATE INDEX IF NOT EXISTS "subscriptions_storeId_status_idx" ON "subscriptions"("storeId", "status");
