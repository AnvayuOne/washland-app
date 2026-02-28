# Franchise Portal

## Goal
Provide a real franchise admin portal with strict server-side tenant isolation.

## UI Routes
- `/franchise/login`
- `/franchise/dashboard`
- `/franchise/stores`
- `/franchise/stores/[id]`
- `/franchise/orders`
- `/franchise/orders/[id]`
- `/franchise/staff`
- `/franchise/reports/commissions`

## API Routes
All franchise APIs require:
- NextAuth session
- `role === FRANCHISE_ADMIN`
- franchise context from DB (`user.managedFranchises`)

Routes:
- `GET /api/franchise/summary`
- `GET /api/franchise/stores`
- `GET /api/franchise/stores/[id]`
- `GET /api/franchise/orders`
- `GET /api/franchise/orders/[id]`
- `GET /api/franchise/staff`
- `POST /api/franchise/staff`
- `GET /api/franchise/reports/commissions`

## Scoping Rules
All reads/writes are scoped by `franchiseId` from `requireFranchiseContext()`.

Implementation helpers:
- `src/lib/tenant.ts`
  - `requireFranchiseContext(sessionOrUserId)`
  - `assertStoreBelongsToFranchise(storeId, franchiseId)`

Scoping examples:
- Orders: `where: { store: { franchiseId } }`
- Stores: `where: { franchiseId }`
- Staff: limited to users tied to stores/orders under the same franchise.

## Commission Formula
Franchise commission uses `Franchise.commissionRate` (default `0.10`).

For selected date range:
- `totalRevenue = sum(order.totalAmount where paymentStatus = PAID)`
- `commissionDue = totalRevenue * commissionRate`
- store rows:
  - `storeRevenue`
  - `storeCommission = storeRevenue * commissionRate`

## Staff Mutations
`POST /api/franchise/staff`
- Supports:
  - activate/deactivate staff (`isActive`)
  - assign store for `STORE_ADMIN` (`storeId`)
- Store assignment is validated against franchise scope.

## Negative Isolation Checks (Manual)
1. Login as franchise admin A.
2. Call `GET /api/franchise/stores/[storeIdOfFranchiseB]`.
3. Expect `403` (`Store does not belong to your franchise`).
4. Call `GET /api/franchise/orders/[orderIdOfFranchiseB]`.
5. Expect `404` (not found under scoped query) or `403` for scoped violations.
6. Try `POST /api/franchise/staff` with store from another franchise.
7. Expect `403`.

## Notes
- Franchise login uses NextAuth credentials flow.
- If a franchise admin account has no franchise mapping, portal blocks access with explicit message.
