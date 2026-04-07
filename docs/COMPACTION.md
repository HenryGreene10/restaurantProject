# Project Compaction / Handoff

Last updated: 2026-04-06

## What Changed Since Last Compaction
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
- Checkout raw SQL enum casts were fixed for `fulfillmentType` and `status` in `CheckoutSession` inserts.

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

Limitations:
- mobile QA is still pending across the full checkout flow
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
- Uses:
  - `GET /v1/kitchen/orders`
  - `PATCH /admin/orders/:orderId/status`
- Polls every 10 seconds
- Shows active orders newest first
- Supports full status progression:
  - `PENDING -> CONFIRMED -> PREPARING -> READY -> COMPLETED`
- Tablet-first card UI is implemented

## What Is Not Done Yet
- Full mobile QA across:
  - storefront browsing
  - cart drawer
  - Stripe checkout flow
  - admin dashboard controls
  - kitchen tablet workflow
- Receipt printing flow:
  - kitchen/admin printable ticket format
  - printer integration path and operational QA
- Loyalty / rewards UI and related customer-facing promotion surfaces
- Remove the temporary Clerk email auto-link bridge after existing admins are fully migrated
- Complete production hardening for payments:
  - real connected-account webhook verification
  - end-to-end QA on live domains
  - refund / failure-path validation
- Drag-and-drop composition controls beyond current category/item ordering
- Promo section stacking / richer page-builder behavior
- AI assistant broader natural-language coverage for theme updates and reorder actions
- Image storage migration away from data URLs toward real object storage

## Current Recommended Next Step
Finish launch-hardening for the first real restaurant deployment.

Recommended next implementation:
1. Run mobile QA across storefront, admin, and kiosk.
2. Build receipt printing.
3. Build loyalty / rewards UI.
4. Finish production hardening:
  - Render/Vercel smoke tests
  - live webhook verification
  - worker deployment
  - env and domain QA
5. Remove the temporary existing-admin auto-link bridge after backfill.

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
