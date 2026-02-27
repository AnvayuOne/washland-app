# Subscriptions

Generated: 2026-02-27

## Domain Model

### `SubscriptionPlan`

- `id`
- `name`
- `description`
- `planType`: `PREMIUM_CARE | RECURRING_LINENS | CUSTOM`
- `billingCycle`: `WEEKLY | MONTHLY | QUARTERLY | YEARLY`
- `price`
- `currency`
- `benefitsJson` (JSON)
- `isActive`
- `storeId` (nullable for global plans)
- `createdAt`, `updatedAt`

### `Subscription`

- `id`
- `userId`
- `planId`
- `storeId`
- `status`: `PAYMENT_PENDING | ACTIVE | CANCELLED | EXPIRED` (plus legacy `PAUSED`)
- `startAt`, `endAt`, `renewAt`
- `autoRenew`
- `createdAt`, `updatedAt`

## API Endpoints

### Admin (Washland)

- `GET /api/admin/plans`
  - Query: `includeInactive=true|false`, optional `storeId`
- `POST /api/admin/plans`
- `GET /api/admin/plans/[id]`
- `PATCH /api/admin/plans/[id]`
- `DELETE /api/admin/plans/[id]`
  - Guard: delete blocked when plan already has subscriptions.

### Public

- `GET /api/plans`
  - Returns active plans only.

### Customer

- `GET /api/customer/subscriptions`
  - Requires NextAuth customer session (`requireRole(["CUSTOMER"])`).
- `POST /api/customer/subscriptions`
  - Body:
    - `planId` (required)
    - `storeId` (required when plan is global)
    - `activateNow` (optional; if omitted flow starts with `PAYMENT_PENDING`)
    - `autoRenew` (optional)
- `POST /api/customer/subscriptions/[id]/cancel`
  - Sets `status = CANCELLED`, `autoRenew = false`, `endAt = now`.

## Lifecycle

1. Plan is created as active/inactive by admin.
2. Customer starts purchase:
   - `PAYMENT_PENDING` by default.
   - `ACTIVE` when `activateNow` is explicitly set.
3. Active subscription can be cancelled by customer.
4. Cancel updates:
   - `status -> CANCELLED`
   - `autoRenew -> false`
   - `endAt -> current timestamp`

## UI Surfaces

- Admin:
  - `/washland/plans`
  - `/washland/plans/new`
  - `/washland/plans/[id]`
- Customer:
  - `/pricing` (lists plans, supports Buy Plan)
  - `/customer/subscriptions` (status + cancellation)
