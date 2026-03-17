# Washland User Flows (End-to-End)

Generated: 2026-02-28  
Scope: App routes, API handlers, and role-based behavior currently present in this repository.

This document is the single navigation map for product flows.  
For deep technical details, also refer to:
- `docs/ORDERS_MODULE.md`
- `docs/CART_FLOW.md`
- `docs/CHECKOUT_FLOW.md`
- `docs/RIDER_MVP.md`
- `docs/FRANCHISE_PORTAL.md`
- `docs/SERVICE_PRICING_MODEL.md`
- `docs/STOCK_INVENTORY.md`
- `docs/SUBSCRIPTIONS.md`
- `docs/LOYALTY_AND_WALLET.md`
- `docs/TENANCY_AND_RBAC.md`

---

## 1) Roles and Main Entry Points

| Role | Primary Login Route | Primary Dashboard |
|---|---|---|
| SUPER_ADMIN | `/washland/login` or `/auth/signin` | `/washland/dashboard` |
| FRANCHISE_ADMIN | `/franchise/login` or `/auth/signin` | `/franchise/dashboard` |
| STORE_ADMIN | `/admin/login` (store-scoped) or `/auth/signin` | `/admin/dashboard` |
| RIDER | `/rider/login` or `/auth/signin` | `/rider/dashboard` |
| CUSTOMER | `/auth/signin` | `/customer/dashboard` |
| Public visitor | no login required | `/`, `/pricing`, `/book-service`, `/locations`, `/contact` |

Role routing logic exists in `src/app/auth/signin/page.tsx` and `middleware.ts`.

---

## 2) Core Platform Setup Flows (Super Admin)

### 2.1 Bootstrap Super Admin Account
1. Call `POST /api/admin/create-washland-admin` with the configured secret.
2. Sign in via `/washland/login` or `/auth/signin`.
3. User lands on `/washland/dashboard`.

### 2.2 Create Franchise
1. Go to `/washland/franchises/new`.
2. Enter franchise details and franchise admin details.
3. UI calls `POST /api/admin/franchises`.
4. Backend creates or upgrades admin user role to `FRANCHISE_ADMIN`, creates franchise, logs activity.
5. Franchise appears at `/washland/franchises`.

### 2.3 Create Store Under Franchise
1. Go to `/washland/stores/new`.
2. Select franchise, enter store details, manager details.
3. UI calls `POST /api/admin/stores`.
4. Backend creates or updates store admin user, links store to franchise, logs activity.
5. Store appears at `/washland/stores`.

### 2.4 Create/Manage Users
1. Open `/washland/users` and `/washland/users/new`.
2. UI calls `/api/admin/users` and `/api/admin/users/[id]`.
3. Super admin assigns roles and active status.
4. Users gain route access based on role.

### 2.5 Configure Global Services and Categories
1. Manage categories: `/washland/services/categories`.
2. Manage services: `/washland/services`, `/washland/services/new`, `/washland/services/[id]`.
3. APIs: `/api/admin/services*` and `/api/admin/services/categories*`.
4. Global service base price and active status become the root catalog.

### 2.6 Configure Plans/Subscriptions
1. Manage plans at `/washland/plans`, `/washland/plans/new`, `/washland/plans/[id]`.
2. APIs: `/api/admin/plans` and `/api/admin/plans/[id]`.

---

## 3) Service & Pricing Governance Flow (Global -> Franchise -> Store)

Final customer-visible price/availability follows this chain:
1. Global service config (`Service`) from super admin.
2. Optional franchise override (`FranchiseService`) via franchise APIs:
   - `GET /api/franchise/services`
   - `PATCH /api/franchise/services/[serviceId]`
3. Optional store override (`StoreService`) via admin APIs:
   - `GET /api/admin/store-services`
   - `PATCH /api/admin/store-services/[serviceId]`

Customer-facing listings use:
- `GET /api/services` (book-service)
- `GET /api/pricing` (landing/pricing)

---

## 4) Public and Customer Flows

### 4.1 Discover Services/Pricing
1. Visitor opens `/`.
2. Landing pulls hero and pricing from public APIs.
3. "View More Services" routes to `/pricing`.
4. `/pricing` shows full service pricing and active plans.

### 4.2 Customer Sign Up
1. Open `/auth/signup`.
2. Submit profile/password.
3. UI calls `POST /api/auth/signup`.
4. Backend validates duplicates, hashes password, creates customer, logs `USER_REGISTERED`.
5. Redirect to `/auth/signin`.

### 4.3 Customer Sign In
1. Open `/auth/signin`.
2. Credentials go through NextAuth (`/api/auth/[...nextauth]`).
3. Role-aware redirect sends customer to `/customer/dashboard`.

### 4.4 Book Service and Build Cart
1. Open `/book-service`.
2. UI loads services from `GET /api/services`.
3. Customer selects items and clicks add-to-cart.
4. UI calls `POST /api/customer/cart/items` with `{ serviceId, quantity }`.
5. Backend creates active cart if needed and recomputes subtotal.

### 4.5 Select Store for Cart
1. Open `/customer/cart`.
2. Choose store and save.
3. UI calls `POST /api/customer/cart/select-store`.
4. Backend validates store and reapplies effective pricing.

### 4.6 Address and Checkout
1. Select address in `/customer/cart`.
2. Click checkout.
3. UI calls `POST /api/customer/checkout` with `idempotencyKey` and `addressId`.
4. Backend validates active cart + store + items + address.
5. Backend creates `Order + OrderItems`, marks cart `CONVERTED`, returns order payload.
6. User is sent to `/customer/orders/current`.

### 4.7 Order Tracking/Detail/Cancel/Reorder
1. List pages: `/customer/orders`, `/customer/orders/current`, `/customer/orders/history`.
2. Detail page: `/customer/orders/[id]`.
3. Customer detail API: `GET /api/customer/orders/[id]`.
4. Cancel API: `POST /api/customer/orders/[id]/cancel` (status rule based).
5. Reorder API: `POST /api/customer/reorder`.

### 4.8 Loyalty and Wallet
1. Pages: `/customer/loyalty`, `/customer/wallet`.
2. APIs:
   - `GET /api/customer/loyalty`
   - `POST /api/customer/loyalty/redeem`
   - `GET /api/customer/wallet`
   - `POST /api/customer/wallet/add-money`
3. Loyalty is awarded on order completion path.

### 4.9 Customer Subscriptions
1. Browse plans on `/pricing`.
2. Buy plan -> `POST /api/customer/subscriptions`.
3. Manage on `/customer/subscriptions`.
4. Cancel via `POST /api/customer/subscriptions/[id]/cancel`.

---

## 5) Store Admin Flows

### 5.1 Store Admin Login
Option A:
1. `/admin/login` with store context.
2. Calls `POST /api/admin/store-login`.

Option B:
1. `/auth/signin`.
2. NextAuth role redirect -> `/admin/dashboard`.

### 5.2 Store Dashboard and Operational Views
- Dashboard: `/admin/dashboard`
- Orders: `/admin/orders`, `/admin/orders/new`, `/admin/orders/[id]`, `/admin/orders/history`
- Reports: `/admin/reports`
- Customers: `/admin/customers`
- Services override: `/admin/services`
- Inventory: `/admin/inventory`

### 5.3 Create/Manage Orders
1. New order page `/admin/orders/new` posts to `POST /api/admin/orders`.
2. Existing order detail page loads `GET /api/admin/orders/[id]`.
3. Update status via `POST /api/admin/orders/[id]/status`.
4. Rider assignment/updates via `PATCH /api/admin/orders/[id]` (`pickupRiderId`, `deliveryRiderId`, status changes).
5. Completing order triggers rewards flow.

### 5.4 Assign Riders
1. Use `/admin/riders/assign` and/or order detail.
2. Fetch riders by store: `GET /api/admin/riders`.
3. Save assignment on order API.

---

## 6) Rider Flows

### 6.1 Rider Login
1. Open `/rider/login`.
2. Uses NextAuth credentials sign-in.
3. Role must be `RIDER`.
4. Redirect to `/rider/dashboard`.

### 6.2 Rider Availability
1. Dashboard toggle updates availability.
2. APIs:
   - `GET /api/rider/availability`
   - `POST /api/rider/availability` with `{ isAvailable }`.

### 6.3 Rider Job List
1. `/rider/dashboard` polls `GET /api/rider/jobs`.
2. Rider sees only jobs where they are assigned (pickup or delivery rider).
3. Jobs are grouped into pending, in-progress, completed tabs.

### 6.4 Rider Job Detail and Status Updates
1. Open `/rider/jobs/[id]`.
2. Page calls `GET /api/rider/jobs/[id]`.
3. Rider actions call `POST /api/rider/jobs/[id]/status`.
4. Allowed rider status actions map to order statuses:
   - `PICKED_UP` -> `IN_PROGRESS`
   - `OUT_FOR_DELIVERY` -> `READY_FOR_PICKUP`
   - `DELIVERED` -> `DELIVERED`
5. Activity log entry `RIDER_STATUS_UPDATE` is recorded.

### 6.5 Order Close
1. Rider marks `DELIVERED`.
2. Store admin (or super admin) marks final `COMPLETED` through admin order status endpoint.

---

## 7) Franchise Admin Flows

### 7.1 Franchise Login and Guard
1. Sign in via `/franchise/login` (NextAuth).
2. Middleware/layout enforces `FRANCHISE_ADMIN`.
3. Account must have linked `franchiseId` context.

### 7.2 Franchise Dashboard
1. Open `/franchise/dashboard`.
2. UI calls `GET /api/franchise/summary`.
3. Returns KPIs, top services, recent activity, revenue trend.

### 7.3 Franchise Stores
1. List: `/franchise/stores` -> `GET /api/franchise/stores`.
2. Detail: `/franchise/stores/[id]` -> `GET /api/franchise/stores/[id]`.
3. Data strictly scoped to current franchise.

### 7.4 Franchise Orders
1. List: `/franchise/orders` -> `GET /api/franchise/orders` with filters.
2. Detail: `/franchise/orders/[id]` -> `GET /api/franchise/orders/[id]`.
3. Scope checks prevent cross-franchise reads.

### 7.5 Franchise Staff
1. Page: `/franchise/staff`.
2. APIs:
   - `GET /api/franchise/staff`
   - `POST /api/franchise/staff` for activation and store assignment operations.

### 7.6 Franchise Commissions
1. Page: `/franchise/reports/commissions`.
2. API: `GET /api/franchise/reports/commissions`.
3. Computes totals and store-wise commission with configured rate.

### 7.7 Franchise Services
1. Page: `/franchise/services`.
2. APIs:
   - `GET /api/franchise/services`
   - `PATCH /api/franchise/services/[serviceId]`
3. Franchise can enable/disable and set franchise default prices.

### 7.8 Franchise Inventory
1. Page: `/franchise/inventory`.
2. Uses inventory API namespace with tenant scope.

---

## 8) Inventory Flows (Super/Franchise/Store Admin)

### 8.1 Roles
Allowed roles: `SUPER_ADMIN`, `FRANCHISE_ADMIN`, `STORE_ADMIN`.

### 8.2 List/Filter Inventory Items
1. UI calls `GET /api/inventory/items`.
2. Optional filters: `storeId`, `search`, `type`, `includeInactive`.
3. Scope resolver limits stores to tenant context.

### 8.3 Create Inventory Item
1. UI posts to `POST /api/inventory/items`.
2. Backend validates stock fields and scope.
3. If initial stock > 0, initial `STOCK_IN` movement is auto-created.

### 8.4 Record Stock Movement
1. UI posts to `POST /api/inventory/movements`.
2. Types include stock in/out, transfer, adjustment, wastage, maintenance.
3. Backend recalculates stockBefore/stockAfter in a transaction.

### 8.5 Inventory Summary and Audit
1. Summary API: `GET /api/inventory/summary`.
2. Movement feed: `GET /api/inventory/movements`.

---

## 9) Order Lifecycle (Current Shared Status Model)

Status values from `src/lib/orderStatus.ts`:
- `PAYMENT_PENDING`
- `PENDING`
- `CONFIRMED`
- `IN_PROGRESS`
- `READY_FOR_PICKUP`
- `DELIVERED`
- `COMPLETED`
- `CANCELLED`

Typical operational path:
1. Checkout creates `PAYMENT_PENDING`.
2. Admin moves to `PENDING`/`CONFIRMED`.
3. Rider pickup: `IN_PROGRESS`.
4. Rider out-for-delivery: `READY_FOR_PICKUP`.
5. Rider delivered: `DELIVERED`.
6. Store/super admin closes: `COMPLETED`.

Server transition validation:
- `canTransition(from, to)` in `src/lib/orderStatus.ts`
- Enforced in admin/rider status endpoints.

---

## 10) Audit and Activity Coverage

`Activity` logging currently exists for key events including:
- user registration
- franchise creation
- store creation
- order placement/completion and payment transitions
- rider status updates
- reorder and cancel actions

Primary logger utility:
- `src/lib/activity-logger.ts`

Note:
- High-impact business actions are covered, but not every CRUD mutation has an activity event yet.

---

## 11) Tenant Isolation and Access Rules

Access model goal:
- SUPER_ADMIN: cross-tenant visibility
- FRANCHISE_ADMIN: own franchise
- STORE_ADMIN: own store
- CUSTOMER: own profile/orders/cart
- RIDER: only assigned jobs

Enforcement layers:
1. Middleware route gating (`middleware.ts`)
2. API role checks (`requireRole`, rbac helpers)
3. Scope filtering (`src/lib/scope.ts`, `src/lib/tenant.ts`)

Forbidden access behavior:
- API: `401/403`
- UI pages: redirect to `/denied` or sign-in flow

---

## 12) Quick Role-to-Flow Checklist

### SUPER_ADMIN
- Create franchise -> create store -> onboard users -> set global services/plans -> monitor network.

### FRANCHISE_ADMIN
- Monitor own franchise -> manage franchise pricing/availability -> manage staff/store health -> review commissions.

### STORE_ADMIN
- Operate daily orders -> assign riders -> update statuses -> close orders -> track inventory.

### RIDER
- Toggle availability -> pick assigned jobs -> update delivery progression -> handoff for order closure.

### CUSTOMER
- Sign up/sign in -> browse services -> add to cart -> select store/address -> checkout -> track/reorder/cancel -> loyalty/wallet/subscriptions.

