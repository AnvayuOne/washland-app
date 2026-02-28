# Tenancy and RBAC

Generated: 2026-02-28

## Role Matrix

| Role | App Route Access | API Namespace Access | Data Scope |
|---|---|---|---|
| `SUPER_ADMIN` | `/washland/*`, `/admin/*` | `/api/admin/*` | Global |
| `FRANCHISE_ADMIN` | `/franchise/*` | `/api/franchise/*` | Own franchise only |
| `STORE_ADMIN` | `/admin/*` | Store-scoped admin endpoints | Own store(s) only |
| `CUSTOMER` | `/customer/*` | `/api/customer/*` | Own user record/data only |
| `RIDER` | `/rider/*` | `/api/rider/*` | Assigned jobs only |

## Server-Side Enforcement

- Session and role checks are centralized in [rbac.ts](/c:/Code/washland/washland-app/src/lib/rbac.ts).
- Tenant scope derivation and reusable Prisma filters are centralized in [scope.ts](/c:/Code/washland/washland-app/src/lib/scope.ts).
- Legacy hybrid header trust was removed from [hybrid-auth.ts](/c:/Code/washland/washland-app/src/lib/hybrid-auth.ts). It is now session-only.
- Middleware protection in [middleware.ts](/c:/Code/washland/washland-app/middleware.ts) enforces role gates for route namespaces and redirects forbidden UI access to `/denied`.

## Scope Rules by Entity

- `Store`:
  - Super admin: all stores.
  - Franchise admin: stores where `store.franchiseId` is in managed franchise ids.
  - Store admin: stores where `store.id` is in managed store ids.
- `Order`:
  - Super admin: all orders.
  - Franchise admin: orders whose `store.franchiseId` is in managed franchise ids.
  - Store admin: orders where `order.storeId` is in managed store ids.
  - Customer: orders where `order.userId = session.user.id`.
  - Rider: orders where `pickupRiderId` or `deliveryRiderId` equals session user id.
- `User` (customer APIs): scoped to `session.user.id`; no client-provided `userId` accepted.

## Removed Insecure Patterns

- Removed API-layer trust of `x-user-id`, `x-user-email`, and `x-user-role`.
- Removed header-based admin fallback auth in hybrid auth helper.
- Admin helper now requires explicit allowed roles per endpoint call.

## Manual Negative Test Checklist

1. Login as Franchise Admin A; call `GET /api/franchise/stores/{storeOfFranchiseB}` -> expect `403/404` equivalent deny.
2. Login as Store Admin A; call `GET /api/admin/orders?storeId=<otherStoreId>` -> expect forbidden.
3. Login as Customer A; call `GET /api/customer/orders/{orderOfCustomerB}` -> expect `404`.
4. Login as Rider A; call `GET /api/rider/jobs/{jobNotAssignedToA}` -> expect `404`.
5. As authenticated but wrong role, open a protected UI route (example rider opening `/admin/dashboard`) -> redirected to `/denied`.
6. Unauthenticated call to protected API route (example `/api/customer/orders`) -> `401`.

