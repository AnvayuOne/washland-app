# Orders Module

## Canonical Statuses

Source of truth: `src/lib/orderStatus.ts`

- `PAYMENT_PENDING`: Order created, payment not settled yet.
- `PENDING`: Order accepted in system and waiting for confirmation/processing.
- `CONFIRMED`: Order confirmed by operations.
- `IN_PROGRESS`: Cleaning/processing in progress.
- `READY_FOR_PICKUP`: Ready for pickup or dispatch.
- `DELIVERED`: Delivered to customer.
- `COMPLETED`: Fulfillment closed.
- `CANCELLED`: Order cancelled.

## Allowed Transitions

- `PAYMENT_PENDING` -> `PENDING`, `CONFIRMED`, `CANCELLED`
- `PENDING` -> `CONFIRMED`, `CANCELLED`
- `CONFIRMED` -> `IN_PROGRESS`, `READY_FOR_PICKUP`, `CANCELLED`
- `IN_PROGRESS` -> `READY_FOR_PICKUP`, `DELIVERED`, `COMPLETED`, `CANCELLED`
- `READY_FOR_PICKUP` -> `DELIVERED`, `COMPLETED`, `CANCELLED`
- `DELIVERED` -> `COMPLETED`
- `COMPLETED` -> none
- `CANCELLED` -> none

Validation helper: `canTransition(from, to)`.

## Role Permissions

- `CUSTOMER`
  - Can read own order details.
  - Can cancel only when status is `PAYMENT_PENDING` or `CONFIRMED`.
  - Can trigger reorder from detail view.
- `STORE_ADMIN`
  - Can read store/admin detail via admin order API.
  - Can move status only through valid transitions.
  - Can assign riders via existing rider assignment flow.
- `SUPER_ADMIN` (Washland)
  - Can read full order detail and activity trail.
  - Can update status via dedicated status endpoint.
  - Can use override mode (`force: true`) in status endpoint.

## Endpoints

- `GET /api/admin/orders`
  - List orders for admin surfaces.
  - Supports single or comma-separated `status` filter.
- `GET /api/admin/orders/[id]`
  - Full admin order detail (items+service, store, user, address, riders).
- `POST /api/admin/orders/[id]/status`
  - Body: `{ status: OrderStatus, note?: string, force?: boolean }`
  - Server-side transition validation, optional override for `SUPER_ADMIN`.
  - Logs activity; triggers loyalty rewards when moved to `COMPLETED`.
- `GET /api/customer/orders/[id]`
  - Customer-scoped order detail (only owner can read).
- `POST /api/customer/orders/[id]/cancel`
  - Customer-scoped cancel action with status guard.

## UI Routes

- Washland detail: `/washland/orders/[id]`
- Store admin detail: `/admin/orders/[id]`
- Customer detail: `/customer/orders/[id]`

List pages now link directly to these detail routes:

- `/washland/orders`
- `/admin/orders`
- `/customer/orders`
