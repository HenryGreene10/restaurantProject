# Patches & Gaps Backlog

Tracked gaps from audit on 2026-05-07. Work through these before or alongside new feature work.

---

## P0 — Security ✅ DONE

### 1. Kitchen route auth ✅

Added `requireClerkAuth` + `requireActiveSubscription` to `/v1/kitchen` prefix in `app.ts`. Tenant now derives from the authenticated admin's record, not an arbitrary header. 5 tests in `kitchen.integration.test.ts`.

---

## P1 — Operational gaps ✅ DONE

### 2. HTTP security headers ✅

Added `helmet` to `apps/api`. `app.use(helmet())` runs before all routes in `createApp()`.

### 3. Platform-admin loyalty endpoint ✅

Added `GET/PATCH /internal/restaurants/:slug/loyalty` in `apps/api/src/routes/internal-loyalty.ts`.
Gated by `x-internal-secret` header matching `INTERNAL_ADMIN_SECRET` env var. Returns 403 if the env var is not configured. Supports all loyalty config fields: `earnRate`, `redeemRate`, `minRedeem`, `expiryMonths`, `welcomeBonus`, `newMemberDiscountEnabled/Type/Value`, `active`.

---

## P2 — Test coverage ✅ DONE

All previously uncovered routes now have integration tests (107 total across 15 test files):

- `loyalty.integration.test.ts` — customer loyalty account + redeem
- `admin-loyalty.integration.test.ts` — config, tiers CRUD, analytics
- `admin-insights.integration.test.ts` — all 7 analytics endpoints
- `admin-brand.integration.test.ts` — brand config GET/PATCH, image upload
- `admin-orders.integration.test.ts` — order list with filters, delivery ETA
- `admin-payments.integration.test.ts` — Stripe status, onboarding link
- `admin-printing.integration.test.ts` — settings GET, validation (PATCH is intentionally 409-paused)

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
