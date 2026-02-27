# WashLand Implementation Inventory

Generated: 2026-02-27
Scope: `src/app`, `src/app/api`, `prisma/schema.prisma`, related `src/lib/*`
Rule applied: `Implemented` is used only when concrete UI + API + DB usage is present.

## 1) Routes -> Features Mapping

### Public + Auth

| Route | Feature | Component | Status | Evidence | Notes |
|---|---|---|---|---|---|
| `/` | Public pricing snapshot | Client | Implemented | `src/app/page.tsx`, `src/app/api/pricing/route.ts` | UI calls `/api/pricing`; API reads `prisma.service`. |
| `/book-service` | Service browse + booking form shell | Client | Implemented | `src/app/book-service/page.tsx`, `src/app/api/services/route.ts` | UI loads services from DB-backed API. |
| `/pricing` | Public pricing page | Client | Implemented | `src/app/pricing/page.tsx`, `src/app/api/pricing/route.ts` | DB-backed service pricing. |
| `/contact` | Contact + store discovery | Client | Broken | `src/app/contact/page.tsx`, `src/app/api/public/stores/route.ts` | Depends on broken `/api/public/stores` query (`status` field mismatch). |
| `/locations` | Store locator | Client | Broken | `src/app/locations/page.tsx`, `src/app/api/public/stores/route.ts` | Same broken endpoint as `/contact`. |
| `/franchise` | Franchise marketing content | Client | Partial | `src/app/franchise/page.tsx` | UI-only marketing page; no API/DB chain. |
| `/demo` | Hero feature demo | Server | Stub | `src/app/demo/page.tsx` | Demo content only. |
| `/auth/signup` | Customer signup | Client | Implemented | `src/app/auth/signup/page.tsx`, `src/app/api/auth/signup/route.ts` | UI -> API -> `prisma.user.create`. |
| `/auth/forgot-password` | Password reset request | Client | Implemented | `src/app/auth/forgot-password/page.tsx`, `src/app/api/auth/forgot-password/route.ts` | Uses `user` + `passwordResetToken`. |
| `/auth/reset-password` | Password reset submit | Client | Implemented | `src/app/auth/reset-password/page.tsx`, `src/app/api/auth/reset-password/route.ts` | Token validation + password update. |
| `/auth/signin` | Role-based sign in | Client | Implemented | `src/app/auth/signin/page.tsx`, `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth.ts` | Redirect map points to real routes (`/washland/dashboard`, `/franchise/dashboard`, `/admin/dashboard`, `/customer/dashboard`, `/rider/dashboard`). |
| `/washland/login` | Super admin login | Client | Implemented | `src/app/washland/login/page.tsx`, `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth.ts` | Uses NextAuth credentials provider with Prisma user lookup. |
| `/admin/login` | Store admin login | Client | Broken | `src/app/admin/login/page.tsx`, `src/app/api/admin/store-login/route.ts`, `src/app/api/public/stores/route.ts` | Login API is DB-backed, but page also depends on broken `/api/public/stores`. |

### Customer

| Route | Feature | Component | Status | Evidence | Notes |
|---|---|---|---|---|---|
| `/customer/dashboard` | Customer dashboard stats | Client | Implemented | `src/app/customer/dashboard/page.tsx`, `src/app/api/customer/dashboard-stats/route.ts`, `src/app/api/customer/recent-orders/route.ts` | UI + customer APIs + `prisma.order`. |
| `/customer/orders` | Orders list + reorder | Client | Implemented | `src/app/customer/orders/page.tsx`, `src/app/api/customer/orders/route.ts`, `src/app/api/customer/reorder/route.ts` | DB-backed order history + reorder path. |
| `/customer/orders/current` | Active orders tracking | Client | Implemented | `src/app/customer/orders/current/page.tsx`, `src/app/api/customer/orders/route.ts` | Multiple status-filtered order calls to DB-backed endpoint. |
| `/customer/orders/history` | Historical orders + reorder | Client | Implemented | `src/app/customer/orders/history/page.tsx`, `src/app/api/customer/orders/route.ts`, `src/app/api/customer/reorder/route.ts` | DB-backed flows. |
| `/customer/addresses` | Address CRUD | Client | Implemented | `src/app/customer/addresses/page.tsx`, `src/app/api/customer/addresses/route.ts`, `src/app/api/customer/addresses/[id]/route.ts` | CRUD + default address handling on `prisma.address`. |
| `/customer/profile` | Profile + password change | Client | Implemented | `src/app/customer/profile/page.tsx`, `src/app/api/customer/profile/route.ts`, `src/app/api/customer/change-password/route.ts` | DB-backed user profile updates. |
| `/customer/loyalty` | Loyalty view/redeem | Client | Stub | `src/app/customer/loyalty/page.tsx`, `src/app/api/customer/loyalty/route.ts`, `src/app/api/customer/loyalty/redeem/route.ts` | APIs return mock/TODO responses. |
| `/customer/wallet` | Wallet + add money | Client | Stub | `src/app/customer/wallet/page.tsx`, `src/app/api/customer/wallet/route.ts`, `src/app/api/customer/wallet/add-money/route.ts` | APIs are mock/TODO. |
| `/customer/referrals` | Referral dashboard + invite | Client | Broken | `src/app/customer/referrals/page.tsx`, `src/app/api/customer/referrals/route.ts`, `src/app/api/customer/referrals/invite/route.ts` | Main referrals API has syntax error; invite endpoint is TODO stub. |

### Store Admin (`/admin`)

| Route | Feature | Component | Status | Evidence | Notes |
|---|---|---|---|---|---|
| `/admin/dashboard` | Store analytics dashboard | Client | Broken | `src/app/admin/dashboard/page.tsx`, `src/app/api/admin/store-analytics/route.ts`, `src/app/api/public/stores/route.ts` | Mixed dependency; analytics endpoint works, store list endpoint is broken. |
| `/admin/orders` | Store order operations | Client | Partial | `src/app/admin/orders/page.tsx`, `src/app/api/admin/orders/route.ts`, `src/app/api/admin/orders/[id]/route.ts`, `src/app/api/admin/riders/route.ts` | Core CRUD exists; downstream completion path can break via loyalty helper mismatch. |
| `/admin/orders/new` | Create in-store order | Client | Broken | `src/app/admin/orders/new/page.tsx`, `src/app/api/admin/orders/route.ts` | POST can write `userId/addressId` as null though schema requires both. |
| `/admin/pickups/new` | Pickup scheduling | Client | Partial | `src/app/admin/pickups/new/page.tsx`, `src/app/api/admin/orders/route.ts`, `src/app/api/admin/orders/[id]/route.ts` | Existing-order scheduling works; manual-entry path explicitly not fully implemented. |
| `/admin/riders/assign` | Rider assignment | Client | Implemented | `src/app/admin/riders/assign/page.tsx`, `src/app/api/admin/riders/route.ts`, `src/app/api/admin/orders/[id]/route.ts` | UI + APIs + DB-backed rider/order updates. |
| `/admin/hero-content` | Hero content management | Client | Implemented | `src/app/admin/hero-content/page.tsx`, `src/app/api/hero-content/route.ts` | UI + API + `prisma.heroContent`. |
| `/admin/hero-upload` | Hero image upload | Client | Implemented | `src/app/admin/hero-upload/page.tsx`, `src/app/api/admin/hero-upload/route.ts` | Uses `heroContent` + `heroImage` models. |

### Washland Super Admin (`/washland`)

| Route | Feature | Component | Status | Evidence | Notes |
|---|---|---|---|---|---|
| `/washland/dashboard` | Network dashboard | Client | Implemented | `src/app/washland/dashboard/page.tsx`, `src/app/api/admin/analytics/route.ts`, `src/app/api/admin/activities/route.ts` | Strong UI/API/DB chain for analytics and activity feeds. |
| `/washland/franchises` | Franchise list | Client | Implemented | `src/app/washland/franchises/page.tsx`, `src/app/api/admin/franchises/route.ts` | DB-backed listing. |
| `/washland/franchises/new` | Create franchise | Client | Implemented | `src/app/washland/franchises/new/page.tsx`, `src/app/api/admin/franchises/route.ts` | Create flow with DB writes. |
| `/washland/franchises/[id]` | Franchise detail | Client | Implemented | `src/app/washland/franchises/[id]/page.tsx`, `src/app/api/admin/franchises/[id]/route.ts` | DB-backed detail + related stores. |
| `/washland/franchises/[id]/edit` | Franchise edit | Client | Implemented | `src/app/washland/franchises/[id]/edit/page.tsx`, `src/app/api/admin/franchises/[id]/route.ts` | DB-backed update path. |
| `/washland/stores` | Store list | Client | Implemented | `src/app/washland/stores/page.tsx`, `src/app/api/admin/stores/route.ts` | DB-backed listing/create entry points. |
| `/washland/stores/new` | Create store | Client | Implemented | `src/app/washland/stores/new/page.tsx`, `src/app/api/admin/stores/route.ts`, `src/app/api/admin/franchises/route.ts` | DB-backed create flow. |
| `/washland/stores/[id]` | Store detail/edit | Client | Partial | `src/app/washland/stores/[id]/page.tsx`, `src/app/api/admin/stores/[id]/route.ts` | Core read/update works; form includes placeholder-only franchise selection behavior. |
| `/washland/users` | User management | Client | Implemented | `src/app/washland/users/page.tsx`, `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[id]/route.ts` | DB-backed list + status update. |
| `/washland/users/new` | Create user | Client | Implemented | `src/app/washland/users/new/page.tsx`, `src/app/api/admin/users/route.ts` | DB-backed create with role context. |
| `/washland/users/[id]` | User detail/edit | Client | Partial | `src/app/washland/users/[id]/page.tsx`, `src/app/api/admin/users/[id]/route.ts` | Core read/update exists; assignment selectors are limited to already-managed entities in UI. |
| `/washland/users/roles` | User role management | Client | Implemented | `src/app/washland/users/roles/page.tsx`, `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[id]/route.ts` | DB-backed role/status controls. |
| `/washland/services` | Service management | Client | Implemented | `src/app/washland/services/page.tsx`, `src/app/api/admin/services/route.ts`, `src/app/api/admin/services/categories/route.ts` | Full UI/API/DB chain for services + category filter. |
| `/washland/services/new` | Create/update service form | Client | Implemented | `src/app/washland/services/new/page.tsx`, `src/app/api/admin/services/route.ts`, `src/app/api/admin/services/[id]/route.ts` | DB-backed create/update. |
| `/washland/services/[id]` | Service edit alias | Server (re-export) | Implemented | `src/app/washland/services/[id]/page.tsx`, `src/app/washland/services/new/page.tsx` | Re-uses service form page; same API/DB chain as `/washland/services/new`. |
| `/washland/services/categories` | Service categories CRUD | Client | Implemented | `src/app/washland/services/categories/page.tsx`, `src/app/api/admin/services/categories/route.ts`, `src/app/api/admin/services/categories/[id]/route.ts` | DB-backed categories. |
| `/washland/orders` | Cross-network order management | Client | Partial | `src/app/washland/orders/page.tsx`, `src/app/api/admin/orders/route.ts`, `src/app/api/admin/orders/[id]/route.ts` | DB-backed list/update exists; UI links to missing `/washland/orders/[id]` detail route. |
| `/washland/orders/analytics` | Order analytics | Client | Implemented | `src/app/washland/orders/analytics/page.tsx`, `src/app/api/admin/orders/analytics/route.ts` | DB-backed analytics endpoint. |
| `/washland/loyalty/config` | Loyalty config | Client | Implemented | `src/app/washland/loyalty/config/page.tsx`, `src/app/api/admin/loyalty/config/route.ts` | DB-backed config management. |
| `/washland/loyalty` | Loyalty admin report | Client | Broken | `src/app/washland/loyalty/page.tsx`, `src/app/api/admin/loyalty/route.ts` | API selects non-existent `user.name` field. |
| `/washland/referrals` | Referral admin report | Client | Broken | `src/app/washland/referrals/page.tsx`, `src/app/api/admin/referrals/route.ts` | API selects non-existent `referrer.name` / `referred.name`. |

### Franchise/Rider portals

| Route | Feature | Component | Status | Evidence | Notes |
|---|---|---|---|---|---|
| `/franchise/login` | Franchise login | Client | Stub | `src/app/franchise/login/page.tsx` | Local `setTimeout` + localStorage auth placeholder. |
| `/franchise/dashboard` | Franchise dashboard | Client | Stub | `src/app/franchise/dashboard/page.tsx` | Placeholder copy only. |
| `/rider/login` | Rider login | Client | Stub | `src/app/rider/login/page.tsx` | Local `setTimeout` + localStorage auth placeholder. |
| `/rider/dashboard` | Rider dashboard | Client | Stub | `src/app/rider/dashboard/page.tsx` | Placeholder copy only. |

## 2) API -> Features Mapping

| API Route | Methods | Feature | Status | Auth Method | Roles Enforced | Prisma Models Touched | Evidence | Notes |
|---|---|---|---|---|---|---|---|---|
| `/api/admin/activities` | GET | Admin activity feed | Implemented | NextAuth session (`requireAdmin`) | SUPER_ADMIN (default) | activity | `src/app/api/admin/activities/route.ts` | Used by washland dashboard. |
| `/api/admin/analytics` | GET | Network analytics | Implemented | Hybrid (`requireAdminHybrid`) | SUPER_ADMIN (default) | order, user, franchise, store, service, orderItem | `src/app/api/admin/analytics/route.ts` | Main super-admin metrics. |
| `/api/admin/create-washland-admin` | POST | Bootstrap super admin account | Implemented | Secret header/body gate | n/a | user | `src/app/api/admin/create-washland-admin/route.ts` | Protected by `ADMIN_CLI_SECRET`; no session auth. |
| `/api/admin/franchises` | GET, POST | Franchise list/create | Implemented | Hybrid | SUPER_ADMIN (default) | franchise, user | `src/app/api/admin/franchises/route.ts` | |
| `/api/admin/franchises/[id]` | GET, PUT, DELETE | Franchise detail/update/delete | Implemented | Hybrid | SUPER_ADMIN (default) | franchise, user | `src/app/api/admin/franchises/[id]/route.ts` | |
| `/api/admin/hero-upload` | POST | Hero media upload | Implemented | Hybrid | SUPER_ADMIN (default) | heroContent, heroImage | `src/app/api/admin/hero-upload/route.ts` | |
| `/api/admin/loyalty` | GET | Loyalty admin report | Broken | Hybrid | SUPER_ADMIN | loyaltyPoint | `src/app/api/admin/loyalty/route.ts` | Selects `user.name` (not in schema). |
| `/api/admin/loyalty/config` | GET, POST | Loyalty rules config | Implemented | Hybrid | SUPER_ADMIN | loyaltyConfiguration | `src/app/api/admin/loyalty/config/route.ts` | |
| `/api/admin/orders` | GET, POST | Order list/create | Broken | Hybrid | SUPER_ADMIN, STORE_ADMIN | order, store, user, address | `src/app/api/admin/orders/route.ts` | POST can write null `userId/addressId` against required schema fields. |
| `/api/admin/orders/[id]` | GET, PUT, PATCH, DELETE | Order detail/update | Broken | Hybrid | SUPER_ADMIN, STORE_ADMIN | order, orderItem | `src/app/api/admin/orders/[id]/route.ts`, `src/lib/loyalty.ts` | Completion path calls loyalty helper with invalid fields (`type`, `description`). |
| `/api/admin/orders/analytics` | GET | Order analytics | Implemented | Hybrid | SUPER_ADMIN | order | `src/app/api/admin/orders/analytics/route.ts` | |
| `/api/admin/referrals` | GET | Referral admin report | Broken | Hybrid | SUPER_ADMIN | referral | `src/app/api/admin/referrals/route.ts` | Selects non-existent user `name` fields. |
| `/api/admin/riders` | GET | Rider list by store | Implemented | Hybrid | SUPER_ADMIN, STORE_ADMIN | store, user | `src/app/api/admin/riders/route.ts` | |
| `/api/admin/services` | GET, POST | Services list/create | Implemented | Hybrid | SUPER_ADMIN, STORE_ADMIN | service, serviceCategory | `src/app/api/admin/services/route.ts` | |
| `/api/admin/services/[id]` | GET, PATCH, DELETE | Service update/delete | Implemented | Hybrid | SUPER_ADMIN, STORE_ADMIN | service, serviceCategory, orderItem | `src/app/api/admin/services/[id]/route.ts` | |
| `/api/admin/services/categories` | GET, POST | Category list/create | Implemented | Hybrid | SUPER_ADMIN | serviceCategory | `src/app/api/admin/services/categories/route.ts` | |
| `/api/admin/services/categories/[id]` | PATCH, DELETE | Category update/delete | Implemented | Hybrid | SUPER_ADMIN | serviceCategory, service | `src/app/api/admin/services/categories/[id]/route.ts` | |
| `/api/admin/store-analytics` | GET | Store analytics | Partial | Hybrid | SUPER_ADMIN, STORE_ADMIN | order | `src/app/api/admin/store-analytics/route.ts` | `activeRiders` is random placeholder, not DB-backed. |
| `/api/admin/store-login` | POST | Store admin login | Implemented | Public endpoint | Role-checked in logic | user, store | `src/app/api/admin/store-login/route.ts` | Returns role/store context for localStorage flow. |
| `/api/admin/stores` | GET, POST | Store list/create | Implemented | Hybrid | SUPER_ADMIN (default) | store, franchise, user | `src/app/api/admin/stores/route.ts` | |
| `/api/admin/stores/[id]` | GET, PUT, DELETE | Store detail/update/delete | Implemented | Hybrid | SUPER_ADMIN (default) | store, user | `src/app/api/admin/stores/[id]/route.ts` | |
| `/api/admin/users` | GET, POST | User list/create | Implemented | Hybrid | SUPER_ADMIN (default) | user, franchise, store | `src/app/api/admin/users/route.ts` | |
| `/api/admin/users/[id]` | GET, PUT, PATCH, DELETE | User detail/update/delete | Implemented | Hybrid | SUPER_ADMIN (default) | user, franchise, store | `src/app/api/admin/users/[id]/route.ts` | |
| `/api/auth/[nextauth]` | GET, POST | NextAuth handler | Implemented | NextAuth | Role in callbacks/session | user (via `authOptions`) | `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth.ts` | Credentials auth queries Prisma user. |
| `/api/auth/signup` | POST | Signup | Implemented | Public | CUSTOMER default | user | `src/app/api/auth/signup/route.ts` | |
| `/api/auth/forgot-password` | POST | Forgot password | Implemented | Public | n/a | user, passwordResetToken | `src/app/api/auth/forgot-password/route.ts` | |
| `/api/auth/reset-password` | POST | Reset password | Implemented | Public | n/a | passwordResetToken, user | `src/app/api/auth/reset-password/route.ts` | |
| `/api/customer/addresses` | GET, POST | Address list/create | Implemented | Header auth | CUSTOMER | address | `src/app/api/customer/addresses/route.ts` | |
| `/api/customer/addresses/[id]` | PUT, DELETE | Address update/delete | Implemented | Header auth | CUSTOMER | address, order | `src/app/api/customer/addresses/[id]/route.ts` | |
| `/api/customer/addresses/[id]/set-default` | PUT | Set default address | Implemented | Header auth | CUSTOMER | address | `src/app/api/customer/addresses/[id]/set-default/route.ts` | |
| `/api/customer/change-password` | PUT | Change password | Implemented | Header auth | CUSTOMER | user | `src/app/api/customer/change-password/route.ts` | |
| `/api/customer/dashboard-stats` | GET | Dashboard stats | Implemented | Header auth | CUSTOMER | order | `src/app/api/customer/dashboard-stats/route.ts` | |
| `/api/customer/loyalty` | GET | Loyalty account | Stub | Header auth | CUSTOMER | none (mock response) | `src/app/api/customer/loyalty/route.ts` | Explicit TODO + mock data. |
| `/api/customer/loyalty/redeem` | POST | Redeem loyalty | Stub | Header auth | CUSTOMER | none | `src/app/api/customer/loyalty/redeem/route.ts` | TODO stub response. |
| `/api/customer/orders` | GET | Customer orders | Implemented | Header auth | CUSTOMER | order | `src/app/api/customer/orders/route.ts` | |
| `/api/customer/profile` | GET, PUT | Profile read/update | Implemented | Header auth | CUSTOMER | user | `src/app/api/customer/profile/route.ts` | |
| `/api/customer/recent-orders` | GET | Recent orders | Implemented | Header auth | CUSTOMER | order | `src/app/api/customer/recent-orders/route.ts` | |
| `/api/customer/referrals` | GET | Referral summary | Broken | Header auth | CUSTOMER | user, loyaltyConfiguration | `src/app/api/customer/referrals/route.ts` | Syntax error; currently breaks type-check/build. |
| `/api/customer/referrals/invite` | POST | Referral invite | Stub | Header auth | CUSTOMER | none | `src/app/api/customer/referrals/invite/route.ts` | Explicit TODO placeholder. |
| `/api/customer/reorder` | POST | Reorder | Implemented | Header auth | CUSTOMER | order | `src/app/api/customer/reorder/route.ts` | |
| `/api/customer/wallet` | GET | Wallet view | Stub | Header auth | CUSTOMER | none (mock response) | `src/app/api/customer/wallet/route.ts` | Explicit TODO + mock data. |
| `/api/customer/wallet/add-money` | POST | Wallet top-up | Stub | Header auth | CUSTOMER | none | `src/app/api/customer/wallet/add-money/route.ts` | TODO stub response. |
| `/api/hero-carousel` | GET | Hero carousel | Implemented | Public | n/a | heroContent | `src/app/api/hero-carousel/route.ts` | |
| `/api/hero-content` | GET, POST | Hero content CRUD-lite | Implemented | Public | n/a | heroContent | `src/app/api/hero-content/route.ts` | Mutation endpoint is public (no role guard). |
| `/api/loyalty` | POST | Loyalty add/redeem engine | Partial | Public | n/a | loyaltyPoint, wallet, walletTransaction | `src/app/api/loyalty/route.ts` | DB-backed but no auth; not wired to customer UI routes. |
| `/api/pricing` | GET | Pricing catalog | Implemented | Public | n/a | service | `src/app/api/pricing/route.ts` | |
| `/api/public/hero` | GET | Public hero feed | Implemented | Public | n/a | heroContent | `src/app/api/public/hero/route.ts` | |
| `/api/public/stores` | GET | Public store list | Broken | Public | n/a | store | `src/app/api/public/stores/route.ts` | Uses non-existent `store.status` field (`Store` has `isActive`). |
| `/api/public/stores-with-coords` | GET | Store list with coords | Partial | Public | n/a | store | `src/app/api/public/stores-with-coords/route.ts` | Returns placeholder coords/hour/service shape. |
| `/api/referral` | POST | Referral actions (`create/apply/credit`) | Implemented | Public | n/a | referral, wallet, walletTransaction, loyaltyPoint (via lib) | `src/app/api/referral/route.ts`, `src/lib/referral.ts` | DB work is indirect through `src/lib/referral.ts`. |
| `/api/services` | GET | Public services list | Implemented | Public | n/a | service | `src/app/api/services/route.ts` | |
| `/api/test-auth` | GET, POST | Auth diagnostics | Partial | Public | n/a | user | `src/app/api/test-auth/route.ts` | Diagnostic endpoint, not core product flow. |

## 3) DB Model Usage (Prisma Models -> Endpoints/Pages)

| Prisma Model | Status | Endpoints | Pages | Notes |
|---|---|---|---|---|
| Activity | Implemented | `/api/admin/activities` | `/washland/dashboard` | Activity feed is wired. |
| User | Implemented | `/api/admin/analytics`, `/api/admin/users*`, `/api/admin/stores*`, `/api/admin/store-login`, `/api/auth/*`, `/api/customer/profile`, `/api/customer/change-password`, `/api/customer/referrals` | `/auth/*`, `/admin/login`, `/customer/profile`, `/washland/users*`, `/washland/dashboard` | Core identity model is broadly used. |
| PasswordResetToken | Implemented | `/api/auth/forgot-password`, `/api/auth/reset-password` | `/auth/forgot-password`, `/auth/reset-password` | |
| Franchise | Implemented | `/api/admin/franchises*`, `/api/admin/stores`, `/api/admin/users*`, `/api/admin/analytics` | `/washland/franchises*`, `/washland/stores*`, `/washland/dashboard` | |
| Store | Implemented (with one broken path) | `/api/admin/stores*`, `/api/admin/orders`, `/api/admin/riders`, `/api/public/stores*` | `/admin/*`, `/locations`, `/contact`, `/washland/stores*` | `/api/public/stores` is currently broken. |
| Address | Implemented | `/api/customer/addresses*`, `/api/admin/orders` | `/customer/addresses`, `/admin/orders/new` | |
| Service | Implemented | `/api/services`, `/api/pricing`, `/api/admin/services*`, `/api/admin/analytics` | `/`, `/book-service`, `/pricing`, `/washland/services*` | |
| ServiceCategory | Implemented | `/api/admin/services`, `/api/admin/services/categories*` | `/washland/services`, `/washland/services/new`, `/washland/services/categories` | |
| StoreService | Missing | none | none | Model exists in schema but not used in API/page logic. |
| SubscriptionPlan | Missing | none | none | Schema only; no endpoints/pages. |
| SubscriptionItem | Missing | none | none | Schema only; no endpoints/pages. |
| Subscription | Missing | none | none | Schema only; no endpoints/pages. |
| Order | Implemented (with blocker in create path) | `/api/admin/orders*`, `/api/admin/analytics`, `/api/admin/store-analytics`, `/api/customer/orders`, `/api/customer/reorder`, `/api/customer/dashboard-stats`, `/api/customer/recent-orders` | `/admin/orders*`, `/customer/orders*`, `/washland/orders*`, `/washland/dashboard` | Admin POST create path has required-field mismatch bug. |
| OrderItem | Implemented | `/api/admin/orders/[id]`, `/api/admin/services/[id]`, `/api/admin/analytics` | `/admin/orders`, `/washland/services*` | |
| HeroContent | Implemented | `/api/hero-content`, `/api/hero-carousel`, `/api/public/hero`, `/api/admin/hero-upload` | `/admin/hero-content`, `/admin/hero-upload` | |
| HeroImage | Implemented | `/api/admin/hero-upload` | `/admin/hero-upload` | |
| HeroOffer | Missing | none | none | Model exists but no route uses it. |
| Referral | Partial/Broken | `/api/admin/referrals` (broken), `/api/referral` (indirect), `/api/customer/referrals` (broken) | `/washland/referrals`, `/customer/referrals` | Model used, but key referral endpoints are broken/stubbed. |
| LoyaltyPoint | Partial/Broken | `/api/admin/loyalty` (broken), `/api/loyalty`, `/api/referral` (indirect), `/api/admin/orders/[id]` (indirect via loyalty helper) | `/washland/loyalty`, `/customer/loyalty` | Customer loyalty UI path is currently mock; completion reward helper mismatches schema. |
| Wallet | Partial | `/api/loyalty`, `/api/referral` (indirect) | none (customer wallet API is mock) | DB model exists; customer wallet flow not connected to real DB endpoints. |
| WalletTransaction | Partial | `/api/loyalty`, `/api/referral` (indirect) | none | Same as wallet. |
| LoyaltyConfiguration | Implemented | `/api/admin/loyalty/config`, `/api/customer/referrals` | `/washland/loyalty/config`, `/customer/referrals` | Customer endpoint currently blocked by referrals syntax issue. |

## 4) Critical Blockers (Compile/Runtime)

1. Compile blocker: malformed `src/app/api/customer/referrals/route.ts`
- Evidence: `src/app/api/customer/referrals/route.ts:7`, `src/app/api/customer/referrals/route.ts:10`
- Symptom: nested imports/function declarations inside `GET`; `npm run type-check` fails with `'}' expected` at line 104.

2. Runtime blocker: invalid Prisma field in public stores query
- Evidence: `src/app/api/public/stores/route.ts:8`
- Symptom: query filters on `status: 'ACTIVE'`, but `Store` model has `isActive` (see `prisma/schema.prisma:145`).

3. Runtime blocker: invalid user field selection in loyalty/referrals admin APIs
- Evidence: `src/app/api/admin/loyalty/route.ts:18`, `src/app/api/admin/referrals/route.ts:27`, `src/app/api/admin/referrals/route.ts:34`
- Symptom: selects `name` on `User` where schema defines `firstName` + `lastName` (`prisma/schema.prisma:72-73`).

4. Runtime blocker: loyalty helper writes non-existent columns on `LoyaltyPoint`
- Evidence: `src/lib/loyalty.ts:28`, `src/lib/loyalty.ts:30`, `src/lib/loyalty.ts:61`, `src/lib/loyalty.ts:63`, `src/lib/loyalty.ts:78-79`
- Symptom: writes `type` and `description` fields that are not in `LoyaltyPoint` (`prisma/schema.prisma:386-395`).
- Trigger path: called from `src/app/api/admin/orders/[id]/route.ts:204` when order status changes to `COMPLETED`.

5. Runtime blocker: admin order create writes null into required relation fields
- Evidence: `src/app/api/admin/orders/route.ts:207`, `src/app/api/admin/orders/route.ts:209`
- Symptom: `Order.userId` and `Order.addressId` are required (`prisma/schema.prisma:267`, `prisma/schema.prisma:271`) but POST sets `userId || null` and `addressId || null`.

6. Route blocker: sign-in redirects to non-existent pages
- Evidence: `src/app/auth/signin/page.tsx:51`, `src/app/auth/signin/page.tsx:54`, `src/app/auth/signin/page.tsx:57`
- Symptom: resolved by mapping role redirects to existing routes (`/washland/dashboard`, `/franchise/dashboard`, `/admin/dashboard`, `/customer/dashboard`, `/rider/dashboard`).

7. Access-control blocker: middleware protects `/admin/login`
- Evidence: `middleware.ts:46`
- Symptom: matcher `"/admin/:path*"` requires token for all `/admin/*`, including login page.

8. Next 16 build config blocker/warning
- Evidence: `next.config.js` uses `eslint` key (reported by `next build`).
- Symptom: Next 16 reports unsupported/invalid config key.

9. Build execution blocker in current environment
- Evidence: `next build` throws `EPERM` on `.next/trace`.
- Symptom: build cannot complete in current workspace state.

## 5) Top 15 Next Items (Priority Order)

1. High: Fix `src/app/api/customer/referrals/route.ts` syntax and close-brace structure so type-check/build can run.
2. High: Fix `/api/public/stores` filter (`status` -> `isActive`) and verify all public store consumers (`/contact`, `/locations`, `/admin/login`, `/admin/dashboard`).
3. High: Fix admin loyalty/referrals user selectors (`name` -> `firstName`/`lastName`) and validate payload shapes consumed by washland pages.
4. High: Fix `src/lib/loyalty.ts` to match Prisma schema (remove/replace invalid `type`/`description` writes) and retest order completion updates.
5. High: Fix admin order creation for required relations (`userId`, `addressId`) by either creating guest user/address records or making schema/flow consistent.
6. High: Resolve auth redirect map in `src/app/auth/signin/page.tsx` to real routes (`/washland/*`, `/admin/*` that exist).
7. High: Exempt `/admin/login` from middleware protection or scope matcher to protected admin subtrees only.
8. High: Replace stubbed customer loyalty/wallet/referral-invite APIs with real Prisma-backed implementations.
9. Medium: Add missing `/washland/orders/[id]` page or remove `View Details` links from orders table.
10. Medium: Replace franchise/rider localStorage/setTimeout auth stubs with real API + DB auth flows.
11. Medium: Make role enforcement explicit across hybrid-admin endpoints (avoid implicit default SUPER_ADMIN where broader roles are intended).
12. Medium: Add server-side auth/role guards to publicly mutable endpoints (`/api/hero-content` POST, `/api/loyalty`, `/api/referral`) as appropriate.
13. Medium: Remove placeholder/random analytics logic in `/api/admin/store-analytics` (`activeRiders`) and wire to real rider source.
14. Low: Clean mojibake/encoding artifacts in UI copy (e.g., currency and arrows rendered as garbled characters).
15. Low: Update Next 16 config and CI checks (`type-check`, `next build`, Prisma validation) to prevent regressions from shipping.
