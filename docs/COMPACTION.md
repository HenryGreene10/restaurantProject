# Project Compaction / Handoff

Last updated: 2026-04-29

---

## What Changed Since Last Compaction (2026-04-09 → 2026-04-29)

- Landing page redesigned with forest green palette and real product screenshots.
- Logo image rendering fixed in storefront header and admin preview.
- Kitchen kiosk link corrected to use tenant subdomain.
- Signup page now served at `/signup` so landing page CTA buttons work.
- Full codebase audit completed (2026-04-29). Findings documented and V2 sprint plan created.
  - See: `docs/plans/V2_SPRINT_PLAN.md` for prioritized hardening and feature work.

---

## What Changed Since Compaction Before That (before 2026-04-09)

- Stripe Connect Phase 1 is implemented:
  - admin Stripe status endpoint
  - admin onboarding-link endpoint
  - Stripe webhook endpoint
  - tenant Stripe capability sync
  - admin UI entry point for Stripe onboarding
- API deployment path is hardened for Render:
  - Prisma generate runs during build
  - API is bundled with `esbuild`
  - bundle output is CommonJS for Render runtime compatibility
- Admin and storefront deployment path is now Vercel, not just a hosting target in docs.
- Live domain setup is now based on `easymenu.website`.
- Environment variable structure is now clarified operationally:
  - root `.env` for backend/worker/db scripts
  - app-local `.env.local` for Vite frontends
- Business model direction is now explicit:
  - flat monthly SaaS fee
  - not commission-based
- Stripe Phase 2 customer payment collection is now implemented:
  - `POST /v1/checkouts/create-payment-intent`
  - `GET /v1/checkouts/:checkoutSessionId`
  - Stripe Elements payment UI in the storefront
  - webhook-authoritative order creation on `payment_intent.succeeded`
  - direct charges on the restaurant connected account
- Clerk-backed admin authorization and onboarding are now implemented:
  - `AdminUser` is linked by `clerkUserId`
  - self-serve `POST /v1/onboarding/register`
  - existing-admin recovery via `GET /v1/onboarding/me`
  - admin tenant scope now comes from DB-linked restaurant membership, not trusted frontend tenant headers
- Existing-admin migration still uses a temporary Clerk-email auto-link bridge for first login.
- Checkout raw SQL enum casts were fixed for `fulfillmentType` and `status` in `CheckoutSession` inserts and updates.
- Full Stripe payment flow is now working end to end:
  - connected-account onboarding
  - direct-charge checkout
  - webhook-authoritative order creation
  - checkout status transitions
- Apple Pay domain registration is now wired into Stripe onboarding for connected accounts.
- Kitchen dashboard now uses Clerk auth and tenant resolution from Clerk metadata.
- Admin image uploads now use Cloudflare R2 public URLs instead of base64 data URLs in the database.
- Mobile storefront polish is implemented for card layout, hero/logo treatment, sticky cart treatment, and category chip behavior.
- Twilio verification work remains in progress for the fuller customer auth / verification experience.

## Product Direction

- Multi-tenant white-label restaurant ordering platform for independent restaurants.
- Core value: restaurants own branding, customer relationship, and margin.
- Current commercial model is flat monthly SaaS pricing, not order commission.
- Current frontend priority remains admin-driven storefront control and go-live readiness.
- Kitchen UI remains intentionally standardized relative to storefront customization.

## Binding Architecture Constraints

- Multi-tenancy is mandatory from the first backend code. Every tenant-scoped query is structurally scoped by `restaurantId` at the data-access layer, not the route layer.
- Stripe Connect starts in Standard mode.
- Customer auth infrastructure is phone + OTP via Twilio Verify, but OTP no longer blocks the basic pickup checkout flow.
- SMS fallback is required for customer notifications.
- Native app work is deferred until the PWA is proven.
- AI assistant context must be summarized rather than dumping full historical data.
- Custom domains require automated SSL.
- `as any` near tenant scope logic is considered a code review red flag.

## Locked Stack

- Runtime: Node.js + TypeScript
- Backend: Express
- Database: PostgreSQL + Prisma
- Frontend: React + Vite
- Styling: Tailwind with CSS variables for tenant theming in `apps/web`; admin uses scoped CSS for now
- Auth:
  - customer auth: custom JWT + Twilio Verify OTP
  - admin auth: Clerk
- SMS: Twilio Verify + Twilio Messaging
- Payments:
  - Stripe Connect Standard for restaurant onboarding/payouts
  - Stripe Phase 2 direct-charge customer payment collection is implemented
  - Apple Pay is enabled on the platform domain path
  - production QA and rollout hardening are still pending
- Hosting:
  - API: Render
  - Admin: Vercel
  - Storefront: Vercel

## Deployment Topology

- API is deployed on Render.
- API build path is:
  - `prisma generate`
  - `esbuild` bundle
  - CommonJS output at `dist/index.js`
- Admin is deployed on Vercel.
- Storefront is deployed on Vercel.
- Live domain is `easymenu.website`.
- Tenant routing is intended around `*.easymenu.website` plus future custom domains.

## Important Non-Functional Requirements

- Order placement to kitchen screen appearance: under 2 seconds
- Kitchen screen must handle WiFi drops gracefully with optimistic UI and auto-reconnect
- Order status SMS must fire within 30 seconds of status change
- Restaurant admin dashboard must be fully operable on mobile, not just desktop

## Current Database / Backend Status

- Prisma schema is locked and migrated against the real database.
- Seed data is live and reseeded to avoid notification spam:
  - `joes-pizza`
  - `sunrise-cafe`
- Seeded orders stop at `PREPARING`; no seeded `READY` orders and no seeded notification jobs.
- Notification worker is gated by `WORKER_ENABLED=true`.
- Notification retries cap at 3 failures, then `PERMANENTLY_FAILED`.

## Multi-Tenant Foundation

- `packages/data-access` is the tenant-safe data access boundary.
- Public foundation includes:
  - branded `TenantScope`
  - `WithoutRestaurantId<T>`
  - `scopeWhere/scopeCreate/scopeUpdate/scopeDelete`
- Raw Prisma client is not exported through the package public surface.
- API routes consume tenant-bound repositories instead of raw DB access.

## Verified Backend Features

### Auth

- `POST /auth/customer/request-otp`
- `POST /auth/customer/verify-otp`
- `POST /auth/customer/refresh`
- Successful OTP verification persists or reuses a tenant-scoped `Customer`.
- Customer sessions use JWT access token + httpOnly refresh cookie.
- Admin routes are protected with Clerk bearer-token verification.

### Public Menu

- `GET /menu`
- `GET /v1/menu`
- `GET /menu/featured`
- `GET /v1/menu/featured`
- Tenant resolution works via `x-tenant-slug` and host-based resolution.

### Orders

- `POST /v1/orders`
- `GET /v1/orders/:orderId`
- `GET /v1/orders/:orderId/status`
- `PATCH /admin/orders/:orderId/status`
- `GET /v1/kitchen/orders`
- Order item name snapshots are resolved from the real `MenuItem` at order creation.
- Customer must resolve or be created before order persistence.
- Customer-authenticated order creation is supported with bearer token + tenant match enforcement.
- Customer-authenticated order lookup is supported for the dedicated status page.
- Public customer order-status lookup is supported without auth through `GET /v1/orders/:orderId/status`.
- Order status state machine is enforced in a shared service, not in route handlers.
- Valid transitions:
  - `PENDING -> CONFIRMED | CANCELLED`
  - `CONFIRMED -> PREPARING | CANCELLED`
  - `PREPARING -> READY | CANCELLED`
  - `READY -> COMPLETED | CANCELLED`

### Notifications

- `CONFIRMED`, `READY`, and `CANCELLED` enqueue order-status SMS notifications through `NotificationJob` rows.
- Worker lives in `apps/workers`.
- Worker sends via `TWILIO_MESSAGING_SERVICE_SID`.

### Admin Menu APIs

- Category CRUD
- Item CRUD
- Variant CRUD
- Modifier group / option CRUD
- Item-to-modifier-group attach/update/delete
- Category-local item reorder
- Item availability and featured-state updates
- Brand config GET/PATCH

### Payments

- Stripe Connect Standard onboarding status endpoint is live.
- Stripe onboarding-link creation endpoint is live.
- Stripe webhook endpoint is live.
- Stripe account capability sync (`charges_enabled`, `payouts_enabled`) is implemented.
- Restaurant-level Stripe account state is stored on the tenant record.
- Admin UI exposes Stripe payout/onboarding status and launches hosted onboarding.
- `POST /v1/checkouts/create-payment-intent` is live.
- `GET /v1/checkouts/:checkoutSessionId` is live.
- Storefront payments use Stripe Elements and direct charges on the connected restaurant account.
- `payment_intent.succeeded` creates the real order from a checkout snapshot.
- `payment_intent.payment_failed` marks checkout failure without creating an order.
- `CheckoutSession` persistence is currently implemented with raw parameterized SQL because Prisma client generation remains fragile for newly added models.

## Frontend Status

### `apps/web`

Purpose:

- Customer storefront / PWA direction

Current state:

- Real customer storefront exists now, not just a theme playground
- Reads live tenant menu + brand config from `/api/menu`
- Injects CSS variables at `document.documentElement`
- Renders:
  - hero content from saved admin config
  - promo banner
  - category chips
  - featured section
  - real categories/items
  - menu card layouts from saved config
- Hidden categories/items are filtered out of the storefront
- Customer interaction layer exists:
  - item customization drawer
  - variant selection
  - modifier selection
  - quantity
  - item notes
  - Zustand cart state
  - sticky cart summary
  - cart drawer
  - pickup-only checkout step
  - direct pickup checkout with name + phone only
  - delivery shown as "coming soon"
  - Stripe Elements card payment flow
  - checkout-session creation and payment confirmation
  - webhook-backed paid order creation
  - dedicated `/orders/:orderId` status page
  - live order-status polling
  - cart/customer draft persistence across refresh
  - active-order localStorage banner on return visit
- Tenant slug is now URL/domain-driven:
  - subdomain-based in production via `VITE_TENANT_DOMAIN_SUFFIX`
  - `?tenant=` fallback in local development
- OTP infrastructure remains in the codebase for future customer-account/session work, but it does not block basic ordering.
- Mobile storefront polish is now implemented:
  - smaller right-aligned item thumbnails on mobile
  - consistent item card layout with stable price / add-button positions
  - active category chips follow scroll
  - sticky cart bar uses a solid surface
  - hero logo rendering is more intentional and contained
  - empty categories and placeholder promo blocks are hidden

Limitations:

- full cross-device QA is still pending across the full checkout flow
- receipt printing flow is not implemented
- loyalty / rewards UI is not implemented

### `apps/admin`

Purpose:

- Restaurant control surface for storefront customization

Current state:

- Real admin customization panel exists
- Uses live tenant menu data
- Saves persisted brand config through the API
- Clerk-based admin sign-in is wired
- Clerk-backed self-serve restaurant signup is wired
- Existing admins without `tenantSlug` metadata can be recovered through `/v1/onboarding/me`
- Controls available now:
  - logo upload
  - banner upload
  - hero headline
  - hero subheadline
  - hero badge text
  - promo banner text
  - primary brand color
  - light-only background color
  - body font
  - heading font
  - category order
  - category visibility
  - item order inside category
  - item featured state
  - item visibility
  - item sold-out state
  - item image upload
- Preview pane renders the customer storefront using the real menu and current draft settings.
- Image uploads now use Cloudflare R2-backed public URLs instead of base64 data URLs.
- Admin AI assistant is a persistent chat panel in the dashboard layout.
- Assistant command route is `POST /v1/assistant/command`.
- Assistant currently supports:
  - item visibility changes
  - item featured / unfeatured changes
  - category visibility changes
  - add item
  - add category
  - update item fields
  - set item price
  - update storefront copy / brand config text
- Assistant runs on fresh tenant DB context per request.
- Assistant uses name resolution before mutation and returns clarification instead of mutating on ambiguous matches.
- Assistant name resolution uses fuzzy matching (`fuse.js`) to tolerate common typos.
- Assistant maps delete/remove phrasing to hide rather than permanent deletion.
- Assistant supports multi-turn clarification and multi-action commands in a single request.
- Admin Stripe section is now live:
  - Stripe status display
  - account-id/capability display
  - onboarding/review button
- Admin tenant authorization now resolves through backend `AdminUser.clerkUserId` linkage rather than trusting `x-tenant-slug`.

### `apps/kiosk`

Purpose:

- Kitchen / fulfillment surface

Current state:

- Real runnable kitchen dashboard exists in `apps/kiosk`
- Clerk sign-in is required for kitchen access
- Tenant resolution comes from Clerk `publicMetadata.tenantSlug`
- Uses:
  - `GET /v1/kitchen/orders`
  - `PATCH /admin/orders/:orderId/status`
- Polls every 10 seconds
- Shows pending, active, and completed tabs
- Supports full status progression:
  - `PENDING -> CONFIRMED -> PREPARING -> READY -> COMPLETED`
- Tablet-first card UI is implemented
- New-order sound alerts, status-tinted cards, elapsed-time display, and highlighted special instructions are implemented

## What Is Not Done Yet

### Security & Stability Gaps (address before adding more restaurants)

- No rate limiting on `/auth/customer/request-otp` or `/v1/checkouts/create-payment-intent` — public endpoints vulnerable to abuse
- AI assistant error handler serializes full `error.stack` to client response — exposes internals in production
- Stripe `payment_intent.payment_failed` not handled in webhook — failed payments are silent
- Stripe `charge.refunded` not handled — refunds require manual intervention
- Clerk email auto-link bridge not yet removed — temporary bypass of real auth path still active
- Order FSM transitions not validated at route boundary — invalid transitions can pass through to the service layer

### Testing & Observability Gaps

- Zero integration tests for API routes (only notification worker has test coverage)
- No structured logging — Morgan dev mode only; production debugging is guesswork
- Health check does not validate DB connectivity

### Code Quality Gaps

- `apps/admin/src/pages/App.tsx` is 1000+ LOC (menu, orders, brand, loyalty, AI all in one file)
- Prisma client distribution is fragile (documented in KNOWN_WARNINGS.md); raw SQL workarounds accumulating
- Magic numbers scattered inline (TTLs, retry counts, batch sizes)
- No CI/CD pipeline — no automated checks on PR or deploy

### Feature Gaps

- Full mobile QA not yet run across storefront / admin / kiosk
- Loyalty / rewards customer UI not built (backend + admin config complete; customer surface missing)
- Receipt printing flow not end-to-end tested
- RBAC not enforced (`AdminUser.role` exists but is never checked)
- Customer data deletion / GDPR export endpoints not implemented
- Print job queue is a single DB column (`Restaurant.pendingPrintJob`) — races under concurrent polls

## Current Recommended Next Step

See **`docs/plans/V2_SPRINT_PLAN.md`** for the full prioritized plan.

Short version — do these in order:

1. Sprint 0: ESLint + Prettier + GitHub Actions CI (unblocks everything else)
2. Sprint 1: Rate limiting, error sanitization, Stripe failure handling, FSM validation
3. Sprint 2: Integration tests for OTP, checkout, orders; structured logging
4. Sprint 3: Extract admin App.tsx, fix Prisma client distribution
5. Sprint 4: Mobile QA, loyalty UI, receipt printing, RBAC

## Test / Validation Status

- Targeted typecheck is passing for:
  - `apps/admin`
  - `apps/web`
  - `apps/api`
  - `apps/kiosk`
  - `packages/data-access`
  - `packages/payments`
- API deployment build is now verified with:
  - Prisma generate
  - `esbuild` bundle
  - CommonJS output for Render
- `apps/web` build passes locally in this environment.
- Full API suite passes when run outside the sandbox because `supertest` needs to bind a local listener in this environment.
