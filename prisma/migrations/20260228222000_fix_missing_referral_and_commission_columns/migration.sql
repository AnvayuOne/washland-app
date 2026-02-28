-- Align legacy column names with current Prisma schema.
DO $$
BEGIN
  -- Legacy databases may have snake_case commission_rate instead of commissionRate.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'franchises'
      AND column_name = 'commission_rate'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'franchises'
      AND column_name = 'commissionRate'
  ) THEN
    ALTER TABLE "franchises" RENAME COLUMN "commission_rate" TO "commissionRate";
  END IF;
END $$;

ALTER TABLE "franchises"
  ADD COLUMN IF NOT EXISTS "commissionRate" DECIMAL(65,30) NOT NULL DEFAULT 0.10;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "referralCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_referralCode_key"
  ON "users" ("referralCode");
