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

### 5. PWA app marked as deferred ✅

Added a prominent comment to `apps/pwa/src/App.tsx` explaining the app is a skeleton and pointing developers to `apps/web/src/storefront/` as the real ordering flow. Build out when demand for an installable PWA justifies the work.

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
