# Patches & Gaps Backlog

Tracked gaps from audit on 2026-05-07. Work through these before or alongside new feature work.

---

## P0 — Security (fix before next feature work)

### 1. Kitchen route has no auth

**File:** `apps/api/src/routes/kitchen.ts:6`
**Problem:** `GET /v1/kitchen/orders` has no authentication guard. Anyone who knows a tenant slug can pull all active orders, including customer names and phone numbers.
**Fix:** Add `requireClerkAuth` (the kitchen screen already uses Clerk — see `apps/kiosk/src/main.tsx`) before the route, or gate behind a dedicated kitchen-session token.

---

## P1 — Operational gaps (high value, low complexity)

### 2. No HTTP security headers (helmet)

**File:** `apps/api/src/app.ts`
**Problem:** No `helmet` middleware. Missing X-Frame-Options, CSP, HSTS, etc.
**Fix:** `npm install helmet` in `apps/api`, add `app.use(helmet())` near the top of `createApp()`.

### 3. No platform-admin loyalty endpoint

**Context:** There is no way to adjust a restaurant's loyalty economics (earnRate, redeemRate, minRedeem, tiers, etc.) without access to their admin console.
**Workaround today:** One-off script — `createTenantDataAccess(createTenantScope(restaurantId)).loyalty.updateConfig(patch)`.
**Fix:** Add a small internal platform-admin route (e.g. `POST /internal/restaurants/:slug/loyalty`, gated by a `INTERNAL_ADMIN_SECRET` header env var) so adjustments can be made without shell/DB access.

---

## P2 — Test coverage gaps

No integration tests exist for these routes. Refactors are unguarded:

- `apps/api/src/routes/kitchen.ts`
- `apps/api/src/routes/loyalty.ts`
- `apps/api/src/routes/admin-loyalty.ts`
- `apps/api/src/routes/admin-insights.ts`
- `apps/api/src/routes/admin-brand.ts`
- `apps/api/src/routes/admin-orders.ts`
- `apps/api/src/routes/admin-payments.ts`
- `apps/api/src/routes/admin-printing.ts`

---

## P3 — Product decision needed

### 5. PWA app is a skeleton

**File:** `apps/pwa/src/pages/MenuPage.tsx`
**Problem:** The PWA is 30 lines of bare HTML — no cart, no ordering, no checkout. The real customer ordering flow lives in `apps/web/src/storefront/`.
**Decision needed:** Is the PWA being built out (mobile-installable storefront), or is it deferred/abandoned? If deferred, remove or mark clearly so it doesn't create confusion.

---

## One-off script template (loyalty patch)

```ts
// scripts/patch-loyalty.ts
import 'dotenv/config'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'
import { PrismaClient } from '@repo/db'

const prisma = new PrismaClient()
const slug = 'the-restaurant-slug'
const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { slug } })
const da = createTenantDataAccess(createTenantScope(restaurant.id))

await da.loyalty.updateConfig({
  earnRate: 10,
  redeemRate: 100,
  minRedeem: 500,
})

console.log('updated', await da.loyalty.getConfig())
await prisma.$disconnect()
```
