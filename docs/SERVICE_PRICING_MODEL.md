# Service And Pricing Scope Model

## Ownership Layers

1. Global (`SUPER_ADMIN`)
- Manages `ServiceCategory` and `Service` (network catalog).
- Sets global `service.basePrice`.

2. Franchise (`FRANCHISE_ADMIN`)
- Manages franchise-level service rules using `FranchiseService`.
- Can enable/disable a service for the franchise.
- Can set `defaultPrice` for the franchise.

3. Store (`STORE_ADMIN`)
- Manages store-level overrides using `StoreService`.
- Can enable/disable only if the global service and franchise service are enabled.
- Can override price for the store.

## Effective Price Resolution

For a given store + service:

1. `StoreService.price` (if override exists)
2. `FranchiseService.defaultPrice` (if configured)
3. `Service.basePrice` (global fallback)

## Effective Availability Resolution

A service is available for a store only when all are true:

1. `Service.isActive`
2. `FranchiseService.isActive` (or no franchise row exists)
3. `StoreService.isActive` (or no store row exists)

## New APIs

### Franchise
- `GET /api/franchise/services`
- `PATCH /api/franchise/services/[serviceId]`

### Store Admin
- `GET /api/admin/store-services?storeId=...`
- `PATCH /api/admin/store-services/[serviceId]`

### Public Service Listing
- `GET /api/services?storeId=...`
  - Returns effective prices for the selected store.

## Cart Pricing Behavior

- `POST /api/customer/cart/items`:
  - If cart has selected `storeId`, the item uses effective store price.
  - If the service is unavailable at that store, request is rejected.
  - If no store selected yet, global base price is used.

- `POST /api/customer/cart/select-store`:
  - Validates every existing cart item against the selected store.
  - Reprices all cart items to store-effective prices.
  - Rejects store selection if any item is unavailable for that store.
