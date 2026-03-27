# Local Restaurant Ordering Platform (Monorepo)

Scaffold for a multi-tenant, white-label ordering platform per PRD in `docs/PRD.md`.

- Backend: Node + Express + Prisma (Postgres + RLS)
- Frontend: React PWA (brand-config driven)
- Admin + Kitchen: React apps
- Payments: Stripe Connect; Billing for SaaS
- AI Assistant: Claude integration stubs
- Notifications: Twilio SMS + Web Push stubs

See Quickstart below.

## Quickstart (Dev)

1. Copy env file: `cp .env.example .env` and fill values
2. Start infra: `docker compose up -d`
3. Install deps: `npm install`
4. Generate Prisma: `npm -w packages/db run prisma:generate`
5. Run API: `npm -w apps/api run dev`
6. Open PWA/Admin/Kiosk after you add bundlers (or use your preferred setup)

## Tenancy

Tenancy is resolved by host header (subdomain or custom domain). API sets `app.restaurant_id` per request and enforces Postgres RLS. See `packages/db/src/tenant.ts` and `apps/api/src/middleware/tenant.ts`.

## Brand Config

Per-restaurant JSON theme drives UI in PWA/Admin. See `packages/brand-config` and `apps/pwa/src/brand`.

## Status

This is a scaffold: routes, models, and stubs are present; you will need to install deps, hook up real services, and harden security.
