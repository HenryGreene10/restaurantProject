# Project Compaction / Handoff

Last updated: 2026-04-01

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
- `PATCH /admin/orders/:orderId/status`
- Order item name snapshots are resolved from the real `MenuItem` at order creation.
- Customer must resolve or be created before order persistence.
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
- Theme system foundation exists and runs
- Reads live brand config from `/api/menu`
- Injects CSS variables at `document.documentElement`
- Has two presets:
  - Joe's Pizza warm-casual
  - clean minimal
- Playground now supports richer config fields:
  - hero headline/subheadline/badge
  - promo banner
  - menu card layout
  - category chip visibility

Current URL when running:
- `http://127.0.0.1:5173/`

### `apps/admin`
Purpose:
- Restaurant control surface for storefront customization

Current state:
- Real admin customization panel exists
- Uses live tenant menu data
- Saves persisted brand config through the API
- Controls available now:
  - app title
  - tagline
  - hero headline
  - hero subheadline
  - hero badge text
  - promo banner text
  - hero image URL
  - color palette
  - body/heading font
  - button style
  - hero layout
  - menu card layout
  - card radius
  - featured badge visibility
  - category chip visibility
  - category order
  - category visibility
  - item order inside category
  - item featured state
  - item visibility
- Preview pane renders the customer storefront using the real menu and current draft settings.

Current URL when running:
- `http://127.0.0.1:5174/`

## Frontend Priority Reorder
This is the intentional UI sequence now:
1. Admin storefront customization
2. Customer storefront real pages consuming saved config
3. Kitchen UI later, standardized first

This is a frontend reprioritization only. It does not change the backend-first foundation work already completed.

## What Is Not Done Yet
- True customer-facing menu pages in `apps/web` beyond the theme/storefront playground
- Cart state and checkout UI in `apps/web`
- Hero image upload flow (current admin uses URL input only)
- Drag-and-drop composition controls (current admin uses explicit controls and up/down buttons)
- Promo section stacking / richer page-builder behavior
- Stripe onboarding UI
- Kitchen UI refinement
- Loyalty and marketing UI
- AI assistant actual action execution beyond current stub behavior in admin

## Current Recommended Next Step
Move from form-based customization into visual composition controls and a real customer menu page.

Recommended next implementation:
- Build the real customer menu page in `apps/web`
- Render actual categories/items using saved brand config
- Add cart state with Zustand
- Replace simple up/down ordering with drag-and-drop in admin
- Replace hero image URL input with upload flow
- Add promo/section blocks as configurable storefront sections

## Test / Validation Status
- Typecheck is passing for:
  - `apps/admin`
  - `apps/web`
  - `apps/api`
- API integration coverage exists and passes for changed surfaces when run outside the read-only sandbox.
- Some older API integration tests are timing out around the hardcoded 10s boundary in this environment. Those are environment-speed failures, not new logic failures in the latest storefront changes.

## Key Recent Commits
- `1ead849` `feat(web): add theme foundation playground`
- `fadbe26` `feat(admin): add storefront customization preview`
- `0c0b77b` `feat(brand): persist storefront customization settings`
- `f0ee2a2` `feat(admin): add menu presentation customization controls`
- `1cb1f6c` `feat(storefront): add deeper hero and layout customization`

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
- Customer storefront playground: `http://127.0.0.1:5173/`

