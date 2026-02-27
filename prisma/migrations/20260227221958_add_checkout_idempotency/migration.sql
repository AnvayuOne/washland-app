-- Add PAYMENT_PENDING status for checkout-created orders
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_PENDING';

-- Add idempotency key to orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

-- Enforce idempotency per user
CREATE UNIQUE INDEX IF NOT EXISTS "orders_userId_idempotencyKey_key" ON "orders"("userId", "idempotencyKey");
