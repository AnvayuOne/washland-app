-- Inventory stock module migration
CREATE TYPE "InventoryItemType" AS ENUM ('CONSUMABLE', 'CHEMICAL', 'PACKAGING', 'MACHINE', 'SPARE_PART', 'OTHER');

CREATE TYPE "InventoryMovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'WASTAGE', 'TRANSFER_IN', 'TRANSFER_OUT', 'MAINTENANCE');

CREATE TABLE "inventory_items" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "type" "InventoryItemType" NOT NULL DEFAULT 'CONSUMABLE',
  "unit" TEXT NOT NULL DEFAULT 'UNIT',
  "currentStock" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "reorderLevel" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "maxStockLevel" DECIMAL(65,30),
  "costPerUnit" DECIMAL(65,30),
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_movements" (
  "id" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "type" "InventoryMovementType" NOT NULL,
  "quantity" DECIMAL(65,30) NOT NULL,
  "stockBefore" DECIMAL(65,30) NOT NULL,
  "stockAfter" DECIMAL(65,30) NOT NULL,
  "unitCost" DECIMAL(65,30),
  "totalCost" DECIMAL(65,30),
  "note" TEXT,
  "reference" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_items_storeId_isActive_idx" ON "inventory_items"("storeId", "isActive");
CREATE UNIQUE INDEX "inventory_items_storeId_name_key" ON "inventory_items"("storeId", "name");
CREATE INDEX "inventory_movements_inventoryItemId_createdAt_idx" ON "inventory_movements"("inventoryItemId", "createdAt");
CREATE INDEX "inventory_movements_storeId_createdAt_idx" ON "inventory_movements"("storeId", "createdAt");

ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_inventoryItemId_fkey"
  FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
