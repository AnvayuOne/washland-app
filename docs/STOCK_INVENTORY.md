# Stock Inventory Module

## Purpose
Operational stock tracking for:
- Super Admin (network-wide)
- Franchise Admin (franchise-scoped)
- Store Admin (store-scoped)

## Data Model

### InventoryItem
- `storeId`
- `name`, `sku`
- `type` (`CONSUMABLE`, `CHEMICAL`, `PACKAGING`, `MACHINE`, `SPARE_PART`, `OTHER`)
- `unit`
- `currentStock`, `reorderLevel`, `maxStockLevel`
- `costPerUnit`
- `isActive`
- `createdById`

### InventoryMovement
- `inventoryItemId`, `storeId`
- `type` (`STOCK_IN`, `STOCK_OUT`, `ADJUSTMENT`, `WASTAGE`, `TRANSFER_IN`, `TRANSFER_OUT`, `MAINTENANCE`)
- `quantity`
- `stockBefore`, `stockAfter`
- `unitCost`, `totalCost`
- `note`, `reference`
- `createdById`

## API Endpoints

All endpoints are protected and require role in:
- `SUPER_ADMIN`
- `FRANCHISE_ADMIN`
- `STORE_ADMIN`

### `GET /api/inventory/items`
Returns scoped items + accessible stores.

Query params:
- `storeId` (optional)
- `search` (optional)
- `type` (optional)
- `includeInactive=true|false` (optional)

### `POST /api/inventory/items`
Creates a new inventory item (store-scoped).  
If initial stock > 0, creates an initial `STOCK_IN` movement.

### `GET /api/inventory/items/[id]`
Returns item detail + recent movements (scoped).

### `PATCH /api/inventory/items/[id]`
Updates item metadata/status (scoped).

### `GET /api/inventory/movements`
Returns scoped movement history.

Query params:
- `storeId` (optional)
- `inventoryItemId` (optional)
- `limit` (optional, max 200)

### `POST /api/inventory/movements`
Creates a stock movement and atomically updates `currentStock`.

Validation:
- no negative post-movement stock
- movement-type aware quantity logic
- adjustment supports `adjustTo` or signed quantity

### `GET /api/inventory/summary`
Returns scoped summary:
- stores in scope
- total items
- low stock count
- out of stock count
- stock value
- breakdown by type and store

## UI Routes
- Super Admin: `/washland/inventory`
- Franchise Admin: `/franchise/inventory`
- Store Admin: `/admin/inventory`

All three use the same inventory console flow with scope-based data isolation.

## Migration

Inventory migration file:
- `prisma/migrations/20260228212321_add_inventory_stock/migration.sql`

Apply with:
```bash
npx prisma migrate deploy
```
