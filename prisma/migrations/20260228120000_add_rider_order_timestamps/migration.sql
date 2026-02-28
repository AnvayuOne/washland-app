-- Add rider activity type and rider lifecycle timestamps on orders.
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'RIDER_STATUS_UPDATE';

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "pickedUpAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
