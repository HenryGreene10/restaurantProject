# Change Log

Changes made during the audit remediation pass. Most recent first.

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
