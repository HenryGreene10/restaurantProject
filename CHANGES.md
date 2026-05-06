# Change Log

Changes made during the audit remediation pass. Most recent first.

---

## Feature: Subscription status gate

**Branch:** `feature/subscription-status-gate` — merged to main

New restaurants must complete a Stripe Checkout payment before accessing the admin panel.

### Database

Migration `20260505120000_restaurant_subscription_status`: adds `SubscriptionStatus` enum (`PENDING`, `ACTIVE`, `CANCELLED`) and `subscriptionStatus` column to `Restaurant`. All existing restaurants are backfilled to `ACTIVE`.

### API middleware

`apps/api/src/middleware/require-active-subscription.ts` — new middleware applied to all `/admin/*` and `/v1/assistant/command` routes. Returns 402 with `{ error: 'Subscription required', code: 'SUBSCRIPTION_PENDING' | 'SUBSCRIPTION_CANCELLED' }` if status is not `ACTIVE`.

### Onboarding flow

`POST /v1/onboarding/create-setup-session` — creates a Stripe Checkout session in `subscription` mode with two line items: a one-time setup fee (`STRIPE_SETUP_FEE_PRICE_ID`) and a monthly recurring price (`STRIPE_MONTHLY_PRICE_ID`). Returns `{ url }` for client redirect.

### Stripe webhook

`checkout.session.completed` handler in `stripe-webhook.ts` — checks `metadata.type === 'restaurant_setup'`, then calls `activateRestaurantSubscription(restaurantId)` to flip status to `ACTIVE`.

### Admin frontend

`apps/admin/src/lib/api.ts` — `adminFetchJson` throws `SubscriptionRequiredError` on HTTP 402. `App.tsx` catches it and shows a "Complete setup payment" screen that calls the session endpoint on demand. `OnboardingPage.tsx` redirects to Stripe Checkout dynamically after registration (replaces former static `VITE_SETUP_PAYMENT_URL` env var).

### New env vars (required in Render)

- `STRIPE_SETUP_FEE_PRICE_ID` — one-time setup fee price ID
- `STRIPE_MONTHLY_PRICE_ID` — monthly recurring subscription price ID
- `STRIPE_SETUP_SUCCESS_URL` — post-payment redirect URL
- `STRIPE_SETUP_CANCEL_URL` — cancel/back redirect URL

### TypeScript fixes (pre-existing errors resolved in this branch)

- `app.ts:90` — `requestIdMiddleware` cast changed from `Parameters<typeof app.use>[0]` to `express.RequestHandler`
- `admin-orders.ts:38` — added `NonNullable<>` wrapper on `listOrders` param index access
- `stripe-webhook.ts` — removed `import type Stripe from 'stripe'`; replaced `Stripe.Checkout.Session` cast with an inline object type

---

## Security: Order endpoint hardening + CORS fix

**Branch:** `security/order-hardening` — PR open at GitHub

### Rate limit on POST /v1/orders

`apps/api/src/middleware/rate-limit.ts` — added `orderRateLimit` (10 req/IP/min).
Applied to `POST /v1/orders` in `apps/api/src/routes/orders.ts`. The checkout path (`POST /v1/checkouts/create-payment-intent`) already had `checkoutRateLimit` at 20/min.

### Order item count cap

`MAX_ORDER_ITEMS = 50` enforced in both `orders.ts` and `checkouts.ts`. Returns 400 if exceeded.

### CORS — scoped Vercel allowlist

`apps/api/src/app.ts` — replaced blanket `*.vercel.app` CORS pass with a prefix check against `CORS_VERCEL_PROJECT` env var. Without the var, no `*.vercel.app` origin passes. Added to `render.yaml` (sync: false) and `.env.example` with example value `easymenu`. Added `CORS_VERCEL_PROJECT` to `apps/api/src/config/env.ts` env schema as optional string.

## Security: Remove claimLegacyAdminAccessByEmail email bridge

**Branch:** `security/remove-email-bridge` — PR open at GitHub

Removed legacy email-fallback auth path from `clerk-auth.ts`, `platform.ts` repository, and test mock boilerplate in three integration test files.

---

## Refactoring: admin App.tsx split

**Branch:** `refactor/admin-app-split`

`apps/admin/src/pages/App.tsx` reduced from 5156 → 3707 lines by extracting:

- `pages/LoyaltyPage.tsx` — full loyalty program config + analytics (886 lines)
- `pages/InsightsDashboard.tsx` — revenue/order analytics dashboard + all chart primitives + `Insights*` types (472 lines)
- `components/SectionCard.tsx` — shared `<Card>` wrapper used across all admin sections
- `lib/format.ts` — `formatPrice`, `formatUsd`, `formatSignedPercentChange`, `shortDateLabel`

Also prefixed 3 pre-existing dead variables in the printing settings section that ESLint surfaces now that App.tsx is tracked.

## Refactoring: pwa placeholder cleanup

**Branch:** `refactor/admin-app-split`

`apps/pwa/` was a 4-file skeleton with a double `/v1/menu` fetch. Fixed: lifted the fetch into BrandProvider so MenuPage reads from context. Kept the app (not deleted) — KNOWN_WARNINGS.md marks PWA as the planned primary ordering channel.

## Missing feature: loyalty points UI (already done)

`apps/web/src/storefront/RewardsWalletPage.tsx` — full points balance, tier progress, redeem buttons, and transaction history. Already wired into `StorefrontPage.tsx` and routed at `/rewards`. No new work needed.

## Structural: soft-delete for menu items

**Branch:** `structural/menu-item-soft-delete` — PR open (touches DB migration)

Migration `20260505000000_menu_item_soft_delete`: adds `deletedAt DateTime?` to `MenuItem`. `deleteItem()` now sets `deletedAt` instead of hard-deleting. `listItems()`, `listFeaturedItems()`, `getPublicMenu()` all filter `deletedAt: null`. Preserves FK references on `OrderItem` so order history stays intact.

## Structural: DB migration CI gate

**Branch:** `structural/ci-migration-gate`

Added `migration-check` job to `.github/workflows/ci.yml`. Starts Postgres 15 service, applies all migrations via `prisma migrate deploy`, then runs `prisma migrate diff` to fail the build if `schema.prisma` has changes not captured in a migration file.

## Structural: cursor pagination

**Branch:** `structural/pagination`

`GET /admin/menu/items` — optional `?limit=N&cursor=X` params (backward-compat, no params returns all). `listItems()` now returns `{ items, nextCursor }`. Updated all callers (`admin-menu.ts`, `updateItemTags.ts` in ai-assistant).

`GET /admin/orders` — new endpoint with cursor pagination, `limit` (default 50, max 100), `cursor`, and optional `?status=PENDING,CONFIRMED,...` filter. Backed by new `listOrders()` method in tenant data access.
