# Checkout Flow

Generated: 2026-02-27

## Goal

Convert a customer `ACTIVE` cart into an `Order` + `OrderItem[]` with idempotency protection.

## Endpoint

- `POST /api/customer/checkout`

### Request Body

```json
{
  "idempotencyKey": "uuid",
  "addressId": "address_cuid"
}
```

### Authentication

- NextAuth session only
- Role required: `CUSTOMER`
- Enforced using `requireRole(["CUSTOMER"])`

## Validation Rules

1. `idempotencyKey` is required.
2. `addressId` is required (Option A).
3. Address must belong to the current customer.
4. Customer must have an `ACTIVE` cart.
5. Cart must have `storeId`.
6. Cart must contain at least one item.
7. Selected store must exist and be active.

## Idempotency Strategy

- `Order.idempotencyKey` is stored per checkout request.
- DB constraint: unique pair `@@unique([userId, idempotencyKey])`.
- If a request repeats with same key for same user, API returns existing order payload instead of creating duplicate.

## Checkout Behavior

Inside a DB transaction:

1. Calculate:
   - `subtotal = sum(cart_items.lineTotal)`
   - `discount = 0`
   - `tax = 0`
   - `total = subtotal`
2. Create `Order` with:
   - `status = PAYMENT_PENDING`
   - `paymentStatus = PENDING`
   - `totalAmount = total`
   - generated `orderNumber`
   - `idempotencyKey`
3. Create `OrderItem[]` from cart items:
   - `serviceId`, `quantity`, `price = unitPrice`
4. Mark cart status as `CONVERTED`.

## Response

```json
{
  "orderId": "order_cuid",
  "status": "PAYMENT_PENDING",
  "amount": 1234.56
}
```

## UI Wiring

- `src/app/customer/cart/page.tsx`
  - Generates/persists idempotency key in localStorage keyed by cart id.
  - Sends checkout request with `idempotencyKey + addressId`.
  - Redirects to `/customer/orders/current` on success.
  - Removes stored idempotency key after successful checkout.
