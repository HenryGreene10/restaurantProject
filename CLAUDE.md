# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

EasyMenu is a multi-tenant restaurant SaaS platform. Each restaurant gets an isolated branded storefront, kitchen dashboard, and admin panel — deployed as subdomains (`{slug}.easymenu.website`). It is commission-free; restaurants pay a flat subscription. Currently piloting with a live restaurant.

## Commands

### API (primary development target)
```bash
npm run dev                        # run API server (ts-node, hot-reload not included)
npm -w api run test                # run all API tests
npm -w api run test -- --reporter=verbose  # verbose test output
npx vitest run apps/api/src/test/admin-menu.integration.test.ts  # single test file
npm run lint                       # ESLint across apps/*/src packages/*/src
npm run lint:fix                   # ESLint with auto-fix
npm run typecheck                  # tsc --noEmit across all workspaces
```

### Frontend apps (admin, kiosk, pwa, web)
```bash
npm -w admin run dev               # admin panel (Vite dev server)
npm -w web run dev                 # marketing/storefront
npm -w kiosk run dev               # kiosk ordering app
npm -w pwa run dev                 # PWA storefront
```

### Database
```bash
npm -w @repo/db run prisma:migrate    # run pending migrations (dev)
npm -w @repo/db run prisma:generate   # regenerate Prisma client after schema changes
npm run db:reset-seed                 # reset + seed (only works against non-production DBs)
```

Schema lives at `packages/db/prisma/schema.prisma`. Generated client goes to `packages/db/generated/client/`.

## Architecture

### Request flow

```
HTTP → Express (apps/api)
  → requireClerkAuth (admin routes: /admin/*, /v1/assistant/command)
  → tenantMiddleware (resolves req.tenant from x-tenant-slug header or Host header)
  → route handler
  → createTenantDataAccess(scope) or createPlatformDataAccess()
  → Prisma (with RLS SET LOCAL app.restaurant_id)
```

Admin auth: Clerk JWT is verified, `clerkUserId` is looked up in `AdminUser`, and `req.adminUser` is populated with the tenant's `restaurantId` and `tenantSlug`. The tenant middleware then uses `req.adminUser` directly — authenticated admin requests do not need a separate tenant header.

Customer auth: Phone + OTP via Twilio Verify. Produces short-lived JWT (`req.customerIdentity`) separate from Clerk.

### Data access layer (`packages/data-access`)

There are two data access factories — never use raw Prisma outside this package:

- **`createPlatformDataAccess()`** — cross-tenant operations (tenant lookup, admin auth, onboarding, Stripe Connect). Uses the internal Prisma client directly.
- **`createTenantDataAccess(scope)`** — all tenant-scoped reads/writes. Wraps every query in a Postgres transaction that sets `SET LOCAL app.restaurant_id = '...'` to activate Row Level Security. The `scope` is created via `createTenantScope(restaurantId)`.

`createTenantDataAccess` returns namespaced sub-objects: `brand`, `menu`, `customers`, `orders`, `checkouts`, `payments`, `printing`, `loyalty`, `scope`.

### Multi-tenancy

Tenant isolation is enforced at two layers:
1. **Application layer**: every tenant data access call requires a `TenantScope` branded type. The scope helpers (`scopeWhere`, `scopeCreate`, `scopeUpdate`) inject `restaurantId` automatically.
2. **Database layer**: Postgres Row Level Security policies enforce `app.restaurant_id` on all tenant tables. `withTenantConnection(restaurantId, callback)` wraps the transaction.

Never bypass these by calling raw Prisma from route handlers or passing `restaurantId` through ad-hoc `where` clauses.

### Monorepo structure

```
apps/
  api/          Node/Express API — only place with tests
  admin/        Vite/React admin panel (restaurant owner)
  kiosk/        Vite/React kiosk ordering app
  pwa/          Vite/React PWA storefront
  web/          Vite/React marketing site
  workers/      Node background worker — SMS notification polling loop

packages/
  db/           Prisma schema + generated client (@repo/db)
  data-access/  Repository layer (@repo/data-access)
  ai-assistant/ Claude/Groq-powered admin command handler
  auth/         Customer JWT utilities
  brand-config/ Brand config schema/types
  notifications Twilio SMS helpers
  payments/     Stripe Connect helpers
  ui-common/    Shared React component library
```

### Tests

All tests live in `apps/api/src/test/`. They are integration tests using `supertest` against the real Express app. All external I/O is mocked (Clerk, Prisma via `@repo/data-access`, Stripe, Twilio, Sentry, Groq). Tests do not touch a real database.

Test setup sets all required env vars (`src/test/setup.ts`) and globally mocks `@sentry/node` and `groq-sdk` (`src/test/global-mocks.ts`). Each test file mocks `@clerk/backend` and `@repo/data-access` individually using `vi.mock`.

Run a single test: pass the file path directly to `vitest run`.

### Prisma generation fragility

There is one schema in `packages/db/prisma/schema.prisma` but multiple consumers of `@prisma/client`. If Prisma queries on a new model return unexpected results or types are missing, run `npm -w @repo/db run prisma:generate` first. For new models, prefer raw parameterized SQL in the data-access layer if the generated delegate is unreliable at runtime (see KNOWN_WARNINGS.md).

### Environment variables

Copy `.env.example` to `.env` in the repo root for local development. Required: `DATABASE_URL`, `CLERK_SECRET_KEY`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `TWILIO_*`, `BASE_DOMAIN`, and either `ANTHROPIC_API_KEY` or `GROQ_API_KEY`.

### Deployment

API and workers deploy to Render (`render.yaml`). Frontend apps deploy to Vercel. The API is bundled with esbuild (`apps/api/src/index.ts → dist/index.js`).

## Key constraints (from KNOWN_WARNINGS.md)

- **Never scope at the route level alone.** All tenant data must flow through `createTenantDataAccess(scope)` + RLS.
- **Sequential order numbers** use `RestaurantOrderSequence` — never count existing orders.
- **Customer identity is phone-based.** Email is optional.
- **Stripe Connect is Standard mode.** Do not switch to Custom without a clear business reason.
- **PWA-first.** No native app until 5 paying PWA customers.
- Order placement → kitchen screen latency target: under 2 seconds E2E.

## Design system

Tokens and component specs are in `DESIGN.md`. Primary action color is `#C25325` (terracotta). Background is warm parchment (`#FAF7F2`), not white. Typography: Inter for UI, Bree Serif for product headings, DM Serif Display for marketing-only hero statements.
