-- Normalize monetary totals for orders and order items
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tax" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total" DECIMAL(65,30) NOT NULL DEFAULT 0;

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "unitPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lineTotal" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Backfill legacy order item values from existing price/quantity
UPDATE "order_items"
SET "unitPrice" = CASE
    WHEN "unitPrice" = 0 THEN "price"
    ELSE "unitPrice"
  END;

UPDATE "order_items"
SET "lineTotal" = "unitPrice" * "quantity";

-- Backfill order-level monetary fields from order_items
UPDATE "orders" o
SET "subtotal" = COALESCE(agg."subtotal", 0),
    "total" = COALESCE(agg."subtotal", 0) - COALESCE(o."discount", 0) + COALESCE(o."tax", 0),
    "totalAmount" = COALESCE(agg."subtotal", 0) - COALESCE(o."discount", 0) + COALESCE(o."tax", 0)
FROM (
  SELECT "orderId", COALESCE(SUM("lineTotal"), 0) AS "subtotal"
  FROM "order_items"
  GROUP BY "orderId"
) agg
WHERE o."id" = agg."orderId";

-- Orders without items still need normalized totals
UPDATE "orders" o
SET "subtotal" = 0,
    "total" = 0 - COALESCE(o."discount", 0) + COALESCE(o."tax", 0),
    "totalAmount" = 0 - COALESCE(o."discount", 0) + COALESCE(o."tax", 0)
WHERE NOT EXISTS (
  SELECT 1 FROM "order_items" oi WHERE oi."orderId" = o."id"
);