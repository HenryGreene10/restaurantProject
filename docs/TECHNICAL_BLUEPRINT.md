# Technical Blueprint (Phase 1)

## Package Responsibilities (Monorepo via Turborepo)
- services/api: Fastify server, routing, auth, payments webhooks, tenancy resolution.
- services/web: React + Vite customer app (later phases; validated after admin/kitchen).
- services/workers: background jobs (notifications outbox, etc.).
- packages/data-access: Prisma client wrappers, tenant‑safe repositories (do not export raw client).
- packages/tenant-context: tenant resolution + DB connection scoping helper.
- packages/auth: JWT utilities, admin password hashing, customer token issuance post‑OTP.
- packages/brand: brand config types → CSS variables/Tailwind tokens.
- packages/notify: Twilio SMS + Web Push adapters.
- packages/payments: Stripe Connect/Billing facades.
- packages/ai: Assistant runner + tool interfaces (Phase 2 for model calls).
- packages/ui: Shared UI primitives with Tailwind + CSS variables.

## Proposed Database Schema (Initial)
See `docs/architecture/SCHEMA_PROPOSAL.md` and review before code.

## Phase 1 Build Order
1) Database schema + RLS policies + seed script skeleton.
2) Auth foundations: admin email/password; customer phone + Twilio Verify OTP → JWT.
3) Core API routes (no UI): tenant resolution, menu CRUD, customer CRUD, order status stub, payments webhook stub.
4) Stripe Connect Standard onboarding + Stripe Billing wiring.
5) Admin dashboard skeleton + kitchen screen polling once API is verified.
6) PWA later, after admin/kitchen stabilize.

Gate: Vertical Slice DoD must pass before proceeding.
