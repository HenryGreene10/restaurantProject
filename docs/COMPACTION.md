# Project Compaction / Handoff

Last updated: 2026-04-03

## Product Direction
- Multi-tenant white-label restaurant ordering platform for independent restaurants.
- Core value: restaurants own branding, customer relationship, and margin.
- Current frontend priority is admin-driven customer storefront customization.
- Kitchen UI is intentionally standardized for now and deprioritized relative to storefront customization.

## Binding Architecture Constraints
- Multi-tenancy is mandatory from the first backend code. Every tenant-scoped query is structurally scoped by `restaurantId` at the data-access layer, not the route layer.
- Stripe Connect starts in Standard mode.
- Customer auth is phone + OTP via Twilio Verify.
- SMS fallback is required for customer notifications.
- Native app work is deferred until the PWA is proven.
- AI assistant context must be summarized rather than dumping full historical data.
- Custom domains require automated SSL.
- `as any` near tenant scope logic is considered a code review red flag.

## Locked Stack
- Runtime: Node.js + TypeScript
- Backend: Express currently implemented, though architecture docs originally locked Fastify; codebase is running on Express now
- Database: PostgreSQL + Prisma
- Frontend: React + Vite
- Styling: Tailwind with CSS variables for tenant theming in `apps/web`; admin uses scoped CSS for now
- Auth: Custom JWT + Twilio Verify OTP
- SMS: Twilio Verify + Twilio Messaging
- Payments: Stripe Connect Standard + Stripe Billing
- Hosting target: Railway or Render for backend, Vercel for frontend
- Monorepo: npm workspaces now; Turborepo remains the intended final tooling direction in docs

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

### Public Menu
- `GET /menu`
- `GET /v1/menu`
- `GET /menu/featured`
- `GET /v1/menu/featured`
- Tenant resolution works via `x-tenant-slug` and host-based resolution.

### Orders
- `POST /v1/orders`
- `GET /v1/orders/:orderId`
- `PATCH /admin/orders/:orderId/status`
- `GET /v1/kitchen/orders`
- Order item name snapshots are resolved from the real `MenuItem` at order creation.
- Customer must resolve or be created before order persistence.
- Customer-authenticated order creation is supported with bearer token + tenant match enforcement.
- Customer-authenticated order lookup is supported for the dedicated status page.
- Order status state machine is enforced in a shared service, not in route handlers.
- Valid transitions:
  - `PENDING -> CONFIRMED | CANCELLED`
  - `CONFIRMED -> PREPARING | CANCELLED`
  - `PREPARING -> READY | CANCELLED`
  - `READY -> COMPLETED | CANCELLED`

### Notifications
- `READY` queues `NotificationJob` rows with `ORDER_READY`.
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
- Customer interaction layer now exists:
  - item customization drawer
  - variant selection
  - modifier selection
  - quantity
  - item notes
  - Zustand cart state
  - sticky cart summary
  - cart drawer
  - pickup-only checkout step
  - OTP phone verification inside checkout
  - delivery shown as "coming soon"
  - real `POST /v1/orders` submission
  - dedicated `/orders/:orderId` status page
  - live order-status polling
  - cart/customer draft persistence across refresh
  - session restore via customer refresh token flow

Limitations:
- no payment UI yet
- tenant slug is still store-driven in the frontend, not URL-driven yet
- default local tenant is still `joes-pizza`

Current URL when running:
- `http://127.0.0.1:5173/`
- tenant resolution in `apps/web` currently comes from the Zustand theme store, not the pathname

### `apps/admin`
Purpose:
- Restaurant control surface for storefront customization

Current state:
- Real admin customization panel exists
- Uses live tenant menu data
- Saves persisted brand config through the API
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
- Admin AI assistant is now a persistent chat panel in the dashboard layout, not a tab.
- Assistant command route is `POST /v1/assistant/command`.
- Assistant currently supports:
  - item visibility changes
  - item featured / unfeatured changes
  - category visibility changes
- Assistant runs on fresh tenant DB context per request.
- Assistant uses name resolution before mutation and returns clarification instead of mutating on ambiguous matches.
- Assistant name resolution now uses fuzzy matching (`fuse.js`) to tolerate common typos.
- Assistant maps delete/remove phrasing to hide rather than permanent deletion.
- Current desktop layout is:
  - left: manual controls
  - right top: compact assistant panel
  - right bottom: live storefront preview

Current URL when running:
- `http://127.0.0.1:5174/`

### `apps/kiosk`
Purpose:
- Kitchen / fulfillment surface

Current state:
- Minimal scaffold exists already in `apps/kiosk`
- Existing backend kitchen feed route already exists at `GET /v1/kitchen/orders`
- Existing status transition route for kitchen progression remains `PATCH /admin/orders/:orderId/status`
- Full tablet-grade kitchen dashboard is not built yet

## Frontend Priority Reorder
This is the intentional UI sequence now:
1. Admin storefront customization
2. Customer storefront real pages consuming saved config
3. Kitchen UI later, standardized first

This is a frontend reprioritization only. It does not change the backend-first foundation work already completed.

## What Is Not Done Yet
- Drag-and-drop composition controls beyond current category/item ordering
- Promo section stacking / richer page-builder behavior
- Payment UI / Stripe checkout integration for the storefront
- Stripe onboarding UI
- Kitchen dashboard implementation in `apps/kiosk`
- Loyalty and marketing UI
- AI assistant tool expansion beyond visibility / featured mutations
- AI assistant broader natural-language coverage for theme updates and reorder actions
- URL-based tenant resolution in `apps/web` and future kitchen UI

## Current Recommended Next Step
Build the kitchen dashboard in `apps/kiosk`, then tighten tenant resolution and go-live readiness for the customer/order loop.

Recommended next implementation:
1. Kitchen dashboard in `apps/kiosk`:
  - show active tenant orders newest first
  - tablet-first card UI
  - 10s polling
  - status progression buttons using existing backend transitions
2. Tenant resolution cleanup:
  - move `apps/web` off the hardcoded Zustand tenant default toward URL-driven slug resolution
  - apply the same pattern to kiosk
3. Go-live checkout completion:
  - payment UI / Stripe checkout
  - kitchen/operator QA
  - deployment/environment hardening

## Test / Validation Status
- Typecheck is passing for:
  - `apps/admin`
  - `apps/web`
  - `apps/api`
- `packages/ai-assistant`
- API integration coverage exists and passes for changed surfaces when run outside the read-only sandbox.
- Latest verified assistant/backend/admin checks:
  - `npm -w packages/ai-assistant run typecheck`
  - `npm -w apps/api run typecheck`
  - `npm -w apps/admin run typecheck`
  - `npm -w apps/api run test`
- `apps/web` build passes locally in this environment.
- `apps/admin` production build has intermittently hung at Vite's `transforming...` step in this environment without emitting a concrete error; typecheck is clean.
- Full API suite passes when run outside the sandbox because `supertest` needs to bind a local listener in this environment.

## Key Recent Commits
- `7ab18f5` `docs: add project compaction handoff`
- `1ead849` `feat(web): add theme foundation playground`
- `fadbe26` `feat(admin): add storefront customization preview`
- `0c0b77b` `feat(brand): persist storefront customization settings`
- `f0ee2a2` `feat(admin): add menu presentation customization controls`
- `1cb1f6c` `feat(storefront): add deeper hero and layout customization`
- `67eeba9` `feat(web): turn theme preview into real storefront`
- `41b19f8` `feat(web): add item customization and cart flow`
- `bff25a0` `feat(web): add pickup-only checkout flow`
- `e5d5acf` `feat(admin): improve storefront editing workflow`
- `4249f8b` `feat(ai): wire assistant menu actions`
- `74ff387` `feat(ui): polish storefront and admin surfaces`
- `363a598` `feat(ui): refine storefront branding and media`
- `6f0a3eb` `feat(ui): improve admin assistant and storefront flows`
- `17f9c7b` `feat(api): add customer order status lookup`

## Run Commands
API:
```bash
cd /mnt/c/Users/henry/Henry2026/RestaurantProject
set -a
source .env
npm -w apps/api run dev
```

Admin:
```bash
cd /mnt/c/Users/henry/Henry2026/RestaurantProject
npm -w apps/admin run dev -- --host 127.0.0.1
```

Web:
```bash
cd /mnt/c/Users/henry/Henry2026/RestaurantProject
npm -w apps/web run dev -- --host 127.0.0.1
```

## URLs
- Admin: `http://127.0.0.1:5174/`
- Customer storefront: `http://127.0.0.1:5173/`
