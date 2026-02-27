# Cart Flow

Generated: 2026-02-27

## Overview

The cart is persisted in PostgreSQL via Prisma (`Cart`, `CartItem`) and is customer-scoped.
Only one `ACTIVE` cart can exist per user at a time (enforced by partial unique index).

## Data Model

- `Cart`
  - `id`
  - `userId`
  - `storeId` (nullable until store selection)
  - `status` (`ACTIVE | CONVERTED | ABANDONED`)
  - `currency`
  - `subtotal`
  - `createdAt`, `updatedAt`
- `CartItem`
  - `id`
  - `cartId`
  - `serviceId`
  - `quantity`
  - `unitPrice`
  - `lineTotal`
  - `createdAt`, `updatedAt`

## Authentication

Cart endpoints require NextAuth session and `CUSTOMER` role via `requireRole(["CUSTOMER"])` in `src/lib/auth.ts`.

## Endpoints

- `GET /api/customer/cart`
  - Returns active cart with items and service details.
  - Response shape:
    - `success: boolean`
    - `cart: Cart | null`

- `POST /api/customer/cart/items`
  - Body: `{ serviceId, quantity }`
  - Validates:
    - `quantity` is integer and `>= 1`
    - service exists and `isActive = true`
  - Creates active cart if missing.
  - Upserts item by `(cartId, serviceId)`:
    - existing item -> quantity increment
    - new item -> insert with server-computed pricing
  - Recomputes cart subtotal server-side.

- `PATCH /api/customer/cart/items/[id]`
  - Body: `{ quantity }`
  - Validates `quantity >= 1`.
  - Updates only items in current user’s active cart.
  - Recomputes subtotal.

- `DELETE /api/customer/cart/items/[id]`
  - Deletes only items in current user’s active cart.
  - Recomputes subtotal.

- `POST /api/customer/cart/select-store`
  - Body: `{ storeId }`
  - Validates store exists and `isActive = true`.
  - Sets `cart.storeId` on active cart (creates cart if missing).

## State Transitions

- Cart lifecycle:
  - `ACTIVE` -> `CONVERTED` (future checkout completion)
  - `ACTIVE` -> `ABANDONED` (future cleanup/expiration)
- Current implementation keeps carts in `ACTIVE` during add/update/remove/select-store operations.

## UI Wiring

- `src/app/book-service/page.tsx`
  - Adds `Add to cart` actions per service.
  - Calls `POST /api/customer/cart/items`.
- `src/app/customer/cart/page.tsx`
  - Displays cart items and subtotal.
  - Quantity controls call `PATCH`.
  - Remove calls `DELETE`.
  - Store selector calls `POST /select-store`.
  - Includes `Continue to Checkout` placeholder button for next flow step.
