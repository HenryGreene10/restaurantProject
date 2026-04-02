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

## Current Reality Check
- The running codebase uses `apps/*` and `packages/*`, not `services/*`.
- Backend is Express, not Fastify.
- `packages/ai-assistant` is now active, not just planned:
  - route: `POST /v1/assistant/command`
  - model: `claude-haiku-4-5-20251001`
  - auth/env: `ANTHROPIC_API_KEY`
  - current tool set:
    - `set_item_visibility`
    - `set_item_featured`
    - `set_category_visibility`
  - name resolution and ambiguity handling are already required before mutation
  - fresh tenant DB context is loaded on every assistant command

## Proposed Database Schema (Initial)
See `docs/architecture/SCHEMA_PROPOSAL.md` and review before code.

## Phase 1 Build Order
1) Database schema + RLS policies + seed script skeleton.
2) Auth foundations: admin email/password; customer phone + Twilio Verify OTP → JWT.
3) Core API routes (no UI): tenant resolution, menu CRUD, customer CRUD, order status stub, payments webhook stub.
4) Stripe Connect Standard onboarding + Stripe Billing wiring.
5) Admin dashboard skeleton, then prioritize customer-facing menu customization controls and live preview once API is verified.
6) Customer storefront pages on top of the shared theme system, with admin-controlled appearance settings reflected in preview and live views.
7) Kitchen screen remains operationally standardized for now and follows after admin customization flows.

Gate: Vertical Slice DoD must pass before proceeding.
