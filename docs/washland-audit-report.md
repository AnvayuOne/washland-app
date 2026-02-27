# WashLand PWA Repository Audit Report

Date: February 27, 2026

## Executive Summary
- The codebase has broad feature coverage for admin and customer operations, but implementation quality is uneven.
- Authentication is hybrid and inconsistent (NextAuth + localStorage/header fallback), which increases security and maintenance risk.
- Several critical runtime/build blockers exist (notably a syntax error in customer referrals API).
- PWA metadata exists (manifest/icons), but service worker and real offline support are not implemented.
- Supabase SDK is configured but not used for app data access; Prisma is the active data layer.

## 1) Routes Analysis

### Route Inventory (App Router)
- Public marketing and auth routes:
  - `/`
  - `/contact`
  - `/locations`
  - `/pricing`
  - `/book-service`
  - `/auth/signin`
  - `/auth/signup`
  - `/auth/forgot-password`
  - `/auth/reset-password`
  - `/demo`
  - `/franchise`
  - `/franchise/login`
  - `/rider/login`
  - `/washland/login`
- Customer routes:
  - `/customer/dashboard`
  - `/customer/orders`
  - `/customer/orders/current`
  - `/customer/orders/history`
  - `/customer/addresses`
  - `/customer/profile`
  - `/customer/loyalty`
  - `/customer/referrals`
  - `/customer/wallet`
- Store admin routes:
  - `/admin/dashboard`
  - `/admin/orders`
  - `/admin/orders/new`
  - `/admin/pickups/new`
  - `/admin/riders/assign`
  - `/admin/hero-content`
  - `/admin/hero-upload`
  - `/admin/login`
- Washland/super-admin routes:
  - `/washland/dashboard`
  - `/washland/franchises`
  - `/washland/franchises/new`
  - `/washland/franchises/[id]`
  - `/washland/franchises/[id]/edit`
  - `/washland/stores`
  - `/washland/stores/new`
  - `/washland/stores/[id]`
  - `/washland/users`
  - `/washland/users/new`
  - `/washland/users/[id]`
  - `/washland/users/roles`
  - `/washland/services`
  - `/washland/services/new`
  - `/washland/services/[id]`
  - `/washland/services/categories`
  - `/washland/orders`
  - `/washland/orders/analytics`
  - `/washland/referrals`
  - `/washland/loyalty`
  - `/washland/loyalty/config`
- Other role dashboards:
  - `/franchise/dashboard`
  - `/rider/dashboard`

### Public vs Protected
- Middleware-protected path groups:
  - `/admin/*`
  - `/customer/*`
  - `/api/admin/*`
- Client-only guarded sections (localStorage/session checks in pages):
  - Most `/washland/*`
  - `/franchise/dashboard`
  - `/rider/dashboard`
- Risk:
  - `/admin/login` is currently under middleware matcher, which conflicts with intended unauthenticated store admin login flow.

### Dynamic Routes
- `/washland/franchises/[id]`
- `/washland/franchises/[id]/edit`
- `/washland/services/[id]`
- `/washland/stores/[id]`
- `/washland/users/[id]`

### Server vs Client Components
- Predominantly client pages.
- Server pages include:
  - `/demo`
  - `/admin/hero-content`
  - `/washland/services/new`
  - `/washland/services/[id]`
  - `/washland/services/categories`
  - `/washland/orders/analytics`
  - `/washland/referrals`
  - `/washland/loyalty`
  - `/washland/loyalty/config`

## 2) Authentication

### Current State
- Supabase Auth: not implemented for runtime authentication.
- Main auth stack:
  - NextAuth credentials provider (Prisma-backed users/passwords).
  - Middleware token checks for `/admin`, `/customer`, and `/api/admin`.
  - Hybrid admin helper supports session auth and fallback header auth (`x-user-email`, `x-user-role`).

### Flows Present
- Customer signup/signin/forgot/reset password: implemented.
- Washland login: implemented via NextAuth credentials.
- Admin store login: implemented as custom API flow.
- Franchise login: placeholder (sets localStorage role after timeout).
- Rider login: placeholder (sets localStorage role after timeout).

### Role-Based Logic
- Roles modeled and used:
  - `SUPER_ADMIN`
  - `FRANCHISE_ADMIN`
  - `STORE_ADMIN`
  - `RIDER`
  - `CUSTOMER`
- Role-based menu and page branching exists.
- API role checks are present but inconsistently enforced.

### Issues
- Signin redirect targets were updated to existing dashboards by role (`/washland/dashboard`, `/franchise/dashboard`, `/admin/dashboard`, `/customer/dashboard`, `/rider/dashboard`).
- Many admin API handlers only short-circuit on `401`, not `403`, so forbidden checks can leak into handler logic.
- Mixed auth paradigms (session + localStorage/header) create maintainability and security risk.

## 3) Database Schema Usage

### Supabase Client Usage
- Supabase SDK is configured but not used for table access (`supabase.from(...)` absent in runtime code).

### Actual Data Access Layer
- Prisma is the active ORM/data access layer.

### Prisma Models Actively Used
- `activity`
- `address`
- `franchise`
- `heroContent`
- `heroImage`
- `loyaltyConfiguration`
- `loyaltyPoint`
- `order`
- `orderItem`
- `passwordResetToken`
- `referral`
- `service`
- `serviceCategory`
- `store`
- `user`
- `wallet`
- `walletTransaction`

### Key Visible Relationships
- Franchise -> Stores
- Store -> Orders
- User -> Orders, Addresses, Referrals, Loyalty points, Wallet
- Order -> OrderItems -> Service
- Service -> ServiceCategory
- User administrative relations to Franchise and Store

### Missing or Weak for Franchise Laundry Domain
- No complete cart model/workflow.
- No complete checkout/payment transaction pipeline.
- Subscription plans exist in schema but are not implemented as productized UI/API flow.
- Store geolocation and operating hours are not modeled strongly (placeholders used in public APIs).
- Rider operations are basic (no scheduling/capacity/zone model).
- Reporting is present but has correctness and quality gaps.

## 4) API & Server Actions

### Server Actions
- No server actions found (`use server` not used).

### API Coverage
- Auth:
  - `/api/auth/[...nextauth]`
  - `/api/auth/signup`
  - `/api/auth/forgot-password`
  - `/api/auth/reset-password`
- Public/content:
  - `/api/services`
  - `/api/pricing`
  - `/api/public/hero`
  - `/api/public/stores`
  - `/api/public/stores-with-coords`
  - `/api/hero-content`
  - `/api/hero-carousel`
- Admin domain:
  - Activities, analytics, franchises, stores, users, services, categories, orders, referrals, loyalty, hero upload, store analytics, store login.
- Customer domain:
  - Addresses, profile, password change, orders, reorder, recent orders, dashboard stats, referrals, loyalty, wallet.
- Utility/debug:
  - `/api/referral`
  - `/api/loyalty`
  - `/api/test-auth`

### Fully Implemented vs Partial/Stubbed
- Mostly implemented:
  - Admin CRUD: franchises, stores, users, services, categories, orders.
  - Auth signup/reset flow.
  - Customer profile/addresses/orders read/reorder.
- Partial or stubbed:
  - Customer loyalty endpoints (mock/placeholder notes).
  - Customer wallet endpoints (mock + TODO comments).
  - Customer referral invite endpoint (placeholder comments).
  - Store analytics includes placeholder/random active rider value.
  - Public stores endpoint contains placeholder assumptions and an invalid schema field usage.
- Broken:
  - Customer referrals API file has malformed nested code and missing closing structure; TypeScript compile fails.

## 5) Business Features Implemented

### Customer Side
- Service listing: implemented.
- Cart: missing as a true backend-backed feature.
- Subscription plans: missing in real app flow.
- Checkout: missing.
- Store selection: partial (locations list exists; order flow not strongly tied to store selection).
- Order placement: partial.
  - Admin can create orders.
  - Customer booking page currently does not submit real order creation.
- Order tracking: implemented via customer order pages and status views.
- Payment integration: missing/placeholder.

### Admin Side
- Dashboard: implemented.
- Manage services: implemented.
- Manage plans: missing.
- Manage stores: implemented.
- Manage franchises: implemented.
- Manage users: implemented.
- Order management: implemented.
- Reports/analytics: partial.

### Store Admin Side
- Store-specific dashboard: implemented with some fallback/mock behavior.
- Order fulfillment: implemented.
- Status updates: implemented.

## 6) PWA Features
- Manifest configured: yes.
- App icons and metadata configured: yes.
- Service worker: not implemented.
- Offline support: not implemented as a real strategy.
- Installable status: partial and likely insufficient on modern browsers without service worker support.

## 7) UI Architecture

### Reuse & Structure
- Reusable component layer exists:
  - Header
  - Dashboard/Store/Customer layouts
  - Unified sidebar
  - Toast provider
  - Shared hooks
- Global layout present.
- No nested route-group layouts for per-area auth/rbac enforcement.

### Design System
- Global CSS variables and utility classes exist.
- Heavy inline styling across many pages.
- Styling consistency is moderate but not strict.

### Consistency Risks
- Sidebar contains links to routes not actually implemented.
- Role dashboards are uneven in maturity (franchise/rider are mostly placeholders).

## 8) Technical Quality

### Folder Structure
- Generally solid base structure for a Next.js app with Prisma.
- Large monolithic page components reduce maintainability.

### Scalability Readiness
- Schema supports multi-role franchise model.
- Implementation lacks consistency needed for safe scaling.

### Major Anti-Patterns / Risks
- Build configured to ignore TypeScript and ESLint errors.
- Critical syntax error in API code currently blocks type checking.
- Mixed auth strategies and localStorage trust in sensitive flows.
- Placeholder/mock logic in production paths.
- Route/middleware/auth redirect mismatches.

## Implemented vs Missing Summary

### Implemented
- Core admin CRUD (franchises/stores/users/services/orders).
- Customer auth lifecycle (signup/signin/reset).
- Customer profile, addresses, order listing/history/reorder.
- Basic analytics endpoints.
- Hero content management endpoints.

### Missing or Incomplete
- Real cart and checkout.
- Payment integration end-to-end.
- Subscription plan product flow.
- Fully implemented franchise and rider portals.
- Robust PWA offline support/service worker.
- Fully consistent and secure auth enforcement across UI and APIs.

## Priority Recommendations

### High Priority
1. Fix compile/runtime blockers immediately:
   - Repair malformed customer referrals API.
   - Resolve schema/query mismatches in loyalty/referrals/public stores endpoints.
2. Unify auth:
   - Standardize on NextAuth session-based authorization for protected actions.
   - Remove trust on client-supplied role/email headers for privileged endpoints.
3. Correct route protection logic:
   - Align middleware matcher with real login pages.
   - Fix signin redirect targets to existing routes.
4. Re-enable strict build quality:
   - Stop ignoring TypeScript and ESLint build errors.

### Medium Priority
1. Implement real customer booking -> order creation -> payment flow.
2. Replace placeholder APIs and mock responses with schema-valid production logic.
3. Introduce route-group layouts and centralized auth guards for maintainability.
4. Remove or lock down debug/test endpoints in non-development environments.

### Low Priority
1. Add service worker and offline caching strategy for full PWA behavior.
2. Clean dead sidebar links and incomplete navigation paths.
3. Decompose large page components into smaller feature modules with shared logic.
