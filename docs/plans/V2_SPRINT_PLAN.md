# V2 Sprint Plan — Hardening & Feature Completeness

_Created: 2026-04-29 following full codebase audit._
_Status: Planning — not yet started._

---

## Where We Are

The core ordering platform is in production with a live pilot (Wa Jeal Sichuan). The end-to-end flow works: menu → cart → Stripe → order → kitchen → SMS notification. The architecture is sound — multi-tenancy enforcement, RLS, and data isolation are done correctly.

What's missing is production hardening: the gaps that don't block a first customer but will hurt at 5–10 restaurants. This sprint plan addresses those gaps in priority order.

---

## Sprint 0 — Development Foundation

**Scope:** 1–2 days. Must land before other sprints begin.
**Goal:** Every subsequent code change is consistently formatted and type-checked in CI.

| #   | Task                                                                            | Why                                                                             |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 0.1 | Add ESLint + Prettier with a shared config in root `package.json`               | Code style is already drifting; merge conflicts will worsen without enforcement |
| 0.2 | Add `lint-staged` + `husky` pre-commit hook (lint + typecheck on changed files) | Catch errors before they reach the repo                                         |
| 0.3 | Add GitHub Actions CI: lint → typecheck → test → build on every PR              | Currently zero automated checks on push                                         |
| 0.4 | Verify all apps pass `tsc --noEmit` cleanly (fix any existing type errors)      | CI is meaningless if baseline is broken                                         |

---

## Sprint 1 — Security & Stability

**Scope:** ~1 week.
**Goal:** No obvious abuse vectors, no secrets leaking to clients, payment failures handled.

| #   | Task                                                                                                                         | Why                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1.1 | Add `express-rate-limit` to `POST /auth/customer/request-otp` (per IP + per phone, 5 req/15 min)                             | Unprotected Twilio endpoint; anyone can spam SMS at our cost                                        |
| 1.2 | Add rate limiting to `POST /v1/checkouts/create-payment-intent` (per IP, 10 req/min)                                         | Prevents checkout abuse and Stripe API hammering                                                    |
| 1.3 | Sanitize error responses in `POST /v1/assistant/command` — log stack server-side, return a safe message to client            | Currently serializes full `error.stack` to JSON response; exposes file paths and internals          |
| 1.4 | Handle `payment_intent.payment_failed` in Stripe webhook handler (mark checkout failed, notify customer)                     | Currently silent on failed payments; customer has no feedback path                                  |
| 1.5 | Handle `charge.refunded` in Stripe webhook (update order status, record refund)                                              | Refunds currently require manual intervention                                                       |
| 1.6 | Remove the Clerk email auto-link bridge after backfilling existing admin records                                             | Temporary bridge has been in place since Clerk migration; it's a bypass of the real auth path       |
| 1.7 | Validate order status FSM transitions at the route boundary (reject invalid transitions with 400 before hitting the service) | FSM logic exists in `services/order-status.ts` but some routes can pass invalid transitions through |

---

## Sprint 2 — Observability & Testing

**Scope:** ~1 week.
**Goal:** Know when things break in production before a customer tells you.

| #   | Task                                                                                                | Why                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 2.1 | Replace Morgan with `pino` + `pino-http`; add request trace IDs on every request                    | Morgan dev-mode logging is not searchable or structured; debugging production incidents is guesswork |
| 2.2 | Write integration tests for the OTP auth flow (request → verify → JWT issued)                       | Highest-risk path: no test coverage, touches Twilio + JWT + DB                                       |
| 2.3 | Write integration tests for checkout (create payment intent → webhook → order created)              | Second-highest-risk path; currently zero test coverage                                               |
| 2.4 | Write integration tests for order status transitions (valid transitions accepted, invalid rejected) | FSM is the core kitchen workflow; regressions here break operations                                  |
| 2.5 | Write integration tests for admin menu mutation (add item → item appears in menu GET)               | Covers the most-used admin operation                                                                 |
| 2.6 | Upgrade health check at `GET /health` to validate DB connectivity and return version info           | Current health check returns static OK; Render/monitoring can't detect DB failures                   |

**Test infrastructure note:** Use `vitest` + `supertest` (already available). Each test spins up the Express app against a test DB with a seeded tenant. The notification worker tests (`apps/workers/src/notification-worker.test.ts`) are a good model.

---

## Sprint 3 — Code Quality

**Scope:** 1–2 weeks.
**Goal:** Code that a second developer can work in without a guided tour.

| #   | Task                                                                                                                                             | Why                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 3.1 | Extract `apps/admin/src/pages/App.tsx` into focused components: `MenuManager`, `OrderQueue`, `BrandSettings`, `LoyaltySettings`, `InsightsPanel` | 1000+ LOC single component; untestable and slow to navigate                        |
| 3.2 | Fix Prisma client distribution — make `packages/db` the single client export; all apps import from it                                            | Documented in `KNOWN_WARNINGS.md` as fragile; raw SQL workarounds are accumulating |
| 3.3 | Centralize magic numbers into a config object (`packages/api/src/config.ts`): TTLs, retry counts, batch sizes, rate limit windows                | Currently hardcoded inline; changing them requires grep-and-pray                   |
| 3.4 | Audit all route handlers for missing or incomplete catch blocks; standardize error shape `{ error: string, code?: string }`                      | Inconsistent error handling means some failures return 500 with no useful message  |
| 3.5 | Add CSRF token validation to customer refresh token endpoint                                                                                     | SameSite=Lax + HTTP-only cookie is good but not CSRF-proof on older browsers       |

---

## Sprint 4 — Feature Completeness

**Scope:** 2–3 weeks.
**Goal:** Deliver the features promised to early restaurants; remove known UX gaps.

| #   | Task                                                                                                                       | Why                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 4.1 | Full mobile QA pass: storefront browsing, cart drawer, Stripe checkout, admin dashboard, kitchen tablet                    | Required before adding new restaurants; current state is unverified                     |
| 4.2 | Receipt printing flow: ESC/POS ticket format, CloudPrnt integration QA, kitchen print-on-confirm                           | Operators need paper tickets; current implementation is wired but not end-to-end tested |
| 4.3 | Loyalty / rewards customer UI: punch card progress, points balance, redemption at checkout                                 | Backend schema + admin config exists; no customer-facing surface yet                    |
| 4.4 | Implement RBAC: `OWNER` / `MANAGER` / `STAFF` roles with permission check middleware                                       | `AdminUser.role` field exists but is never enforced; all staff can do everything        |
| 4.5 | Customer data deletion endpoint (`DELETE /v1/customer/me`) + data export endpoint                                          | GDPR baseline; required before operating in most markets at scale                       |
| 4.6 | Replace `Restaurant.pendingPrintJob` single-column queue with a proper `PrintJob` table (mirror `NotificationJob` pattern) | Current model races under concurrent CloudPrnt polls; low effort, high correctness gain |

---

## Backlog (Post-V2)

These are real needs but not urgent at current scale. Revisit when onboarding restaurant #5+.

- **Redis menu/brand config cache** — menu reads are the most frequent operation; a 60-second cache would dramatically reduce DB load as tenant count grows
- **BullMQ job queue** — replace the DB-poll worker with BullMQ backed by the existing Redis instance; enables retries, dead-letter, priority, and a dashboard
- **Kitchen display WebSocket** — replace 10-second polling with a WebSocket push for sub-second order appearance on kitchen screens (NFR: <2s order-to-screen)
- **Custom domain automation** — Let's Encrypt / ACME cert provisioning per restaurant; currently requires manual DNS setup
- **Analytics dashboards** — revenue trends, repeat customer rate, item popularity; current insights are static SQL queries with no visualization
- **OpenAPI schema generation** — add `zod-to-openapi` so the API contract is machine-readable; enables client SDK generation and easier integrations
- **Multi-language support** — `nameLocalized` field exists in schema; add i18next and a language toggle to the storefront

---

## Priority Rationale

The order matters. Sprint 0 unblocks all subsequent work (lint/CI catches regressions). Sprint 1 addresses the two highest-consequence gaps: abuse of public endpoints and silent payment failures. Sprint 2 means you'll know when Sprint 1 or 4's changes break something. Sprint 3 makes the codebase fast to modify. Sprint 4 ships features.

Skipping Sprint 0–2 to get to Sprint 4 features is the fastest path to a production incident you can't diagnose.

---

## Definition of Done (Per Sprint)

- All tasks have passing tests or are manually QA'd and documented in this file with a ✅
- No new TypeScript errors introduced (`tsc --noEmit` passes)
- ESLint passes with no new suppressions
- COMPACTION.md updated at end of each sprint

---

## Sprint Log

| Sprint | Started    | Completed  | Notes                                                                                                                                                                           |
| ------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0      | 2026-04-29 | 2026-04-29 | ESLint 9 + Prettier + lint-staged + husky + CI. 0 errors, 16 warnings (set-state-in-effect/exhaustive-deps — Sprint 3). Fixed 1 real bug: conditional useMemo in admin App.tsx. |
| 1      | —          | —          |                                                                                                                                                                                 |
| 2      | —          | —          |                                                                                                                                                                                 |
| 3      | —          | —          |                                                                                                                                                                                 |
| 4      | —          | —          |                                                                                                                                                                                 |
