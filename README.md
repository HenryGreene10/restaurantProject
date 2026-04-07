# Local Restaurant Ordering Platform (Monorepo)

Multi-tenant white-label restaurant ordering platform for independent restaurants.

- Backend: Node + Express + Prisma (Postgres + RLS)
- Frontend: React + Vite storefront
- Admin + Kitchen: React apps
- Payments: Stripe Connect Standard onboarding and Phase 2 storefront card collection are implemented
- AI Assistant: tenant-aware admin command surface
- Notifications: Twilio SMS worker

## Source Of Truth

- Current project handoff and implementation state lives in `docs/COMPACTION.md`.
- Use `docs/COMPACTION.md` first when starting new work.

## Deployment Topology

- API: Render
- Admin: Vercel
- Storefront: Vercel
- Live domain: `easymenu.website`
- API deploy build:
  - `prisma generate`
  - `esbuild` bundle
  - CommonJS output at `dist/index.js`

## Quickstart (Dev)

1. Copy env files:
   - `cp .env.example .env`
   - create `apps/web/.env.local`
   - create `apps/admin/.env.local`
2. Fill root `.env` with backend, worker, and DB-script values.
3. Fill app-local `.env.local` files with `VITE_*` frontend values.
4. Start infra:
   - `docker compose -f infra/docker-compose.yml up -d`
5. Install deps:
   - `npm install`
6. Generate Prisma:
   - `npm -w packages/db run prisma:generate`
7. Run API:
   - `npm -w apps/api run dev`
8. Run frontend apps with their Vite dev servers as needed.

## Env Split

- Root `.env`:
  - API
  - worker
  - Prisma / DB scripts
- `apps/web/.env.local`:
  - storefront `VITE_*`
- `apps/admin/.env.local`:
  - admin `VITE_*`

See `docs/ENV_VARS.md` for the current env layout.

## Current App State

- Customer storefront is live with:
  - tenant-aware menu rendering
  - cart
  - Stripe Elements card checkout
  - order status page
  - live order polling
- Admin is live with:
  - Clerk auth
  - Clerk-backed self-serve restaurant signup
  - brand customization
  - menu management
  - AI assistant
  - Stripe onboarding entry point
- Backend admin auth is tenant-bound through stored `AdminUser.clerkUserId` membership, not trusted frontend tenant headers.
- Kitchen dashboard is live with polling and status transitions.
- Stripe Connect Phase 1 is live for restaurant onboarding and webhook capability sync.
- Stripe Phase 2 is live for direct-charge checkout sessions and webhook-authoritative paid order creation.

## Current Launch Backlog

- Mobile QA across storefront, admin, and kitchen
- Receipt printing flow
- Loyalty / rewards UI
- Production webhook and payment QA on live domains
- Removal of the temporary Clerk email auto-link bridge after existing admins are migrated

## Tenancy

- Tenancy is resolved by host header or `x-tenant-slug` on the API.
- Storefront tenant resolution is subdomain-based in production and `?tenant=`-based in local dev.
- API sets tenant scope through the data-access boundary and Postgres RLS rules.

## Business Model

- Flat monthly SaaS fee
- Not commission-based
