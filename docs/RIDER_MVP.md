# Rider MVP

## Overview

Rider MVP provides:

- NextAuth-based rider login at `/rider/login`
- Rider-only dashboard at `/rider/dashboard`
- Rider job detail at `/rider/jobs/[id]`
- Rider-only APIs under `/api/rider/*`
- Rider availability toggle backed by DB (`users.isAvailable`)
- Server-side RBAC and assignment checks

## Role Rules

- Rider pages and rider APIs require a valid NextAuth session.
- Allowed role for rider routes: `RIDER` only.
- Rider can access/update only orders where:
  - `pickupRiderId = session.user.id`, or
  - `deliveryRiderId = session.user.id`

## Rider Status Workflow

Rider action payload accepts:

- `PICKED_UP`
- `OUT_FOR_DELIVERY`
- `DELIVERED`

Canonical order status mapping:

- `PICKED_UP -> IN_PROGRESS`
- `OUT_FOR_DELIVERY -> READY_FOR_PICKUP`
- `DELIVERED -> DELIVERED`

Transition validation:

- Server validates transitions using `canTransition()` from `src/lib/orderStatus.ts`.
- Invalid transitions are rejected with `400`.

Completion rule:

- Rider can move an order to `DELIVERED`.
- `COMPLETED` remains a store-admin/super-admin action.

## Activity Logging

Rider status updates create `Activity` records with:

- `type: RIDER_STATUS_UPDATE`
- `description`: human-readable status change
- `metadata`: `{ orderId, orderNumber, from, to, riderStatus, note }`

## Endpoints

### `GET /api/rider/jobs`

Returns assigned rider jobs for statuses relevant to rider workflow, including:

- `id`, `orderNumber`
- canonical `status`
- `riderStatus` (workflow-facing status)
- pickup address summary
- store info
- scheduled pickup time (`pickupDate`)
- `itemsCount`

### `GET /api/rider/availability`

Returns current rider availability:

```json
{
  "success": true,
  "isAvailable": true
}
```

### `POST /api/rider/availability`

Request body:

```json
{
  "isAvailable": true
}
```

Updates availability for the authenticated rider only.

### `GET /api/rider/jobs/[id]`

Returns full detail for a rider-assigned order only.

Includes:

- customer, store, address
- order items/service details
- latest rider update activity

### `POST /api/rider/jobs/[id]/status`

Request body:

```json
{
  "status": "PICKED_UP | OUT_FOR_DELIVERY | DELIVERED",
  "note": "optional"
}
```

Behavior:

- validates assignment and transition
- updates order status
- sets timestamps:
  - `pickedUpAt` when status becomes `IN_PROGRESS`
  - `deliveredAt` when status becomes `DELIVERED`
- logs `RIDER_STATUS_UPDATE`

## Admin Reflection

Store admin order APIs now include `latestRiderUpdate`, and admin order pages poll for updates so rider changes are surfaced without manual page reload.
Admin rider list API now returns `isAvailable` for each rider and supports `?isAvailable=true|false` filtering.

## Washland User Management

Rider accounts can be created/edited via Washland user management:

- `/washland/users/new`
- `/washland/users/[id]`
- `/washland/users`

`RIDER` is now included in role selectors and labels.
