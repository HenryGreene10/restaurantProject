# Environment Variables

## Scope Rules
- Root `.env` is for Node services and DB scripts:
  - API
  - worker
  - Prisma / DB scripts
- App-local `.env.local` is for Vite frontends:
  - `apps/web/.env.local`
  - `apps/admin/.env.local`
- Frontend variables must be prefixed with `VITE_`.
- Do not assume root `.env` values are automatically available to Vite apps.

## Root `.env`
Used by:
- `apps/api`
- `apps/workers`
- `packages/db` scripts

Current backend/service vars:
- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `BASE_DOMAIN`
- `TENANT_DOMAIN_SUFFIX`
- `JWT_SECRET`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `CUSTOMER_ACCESS_TOKEN_TTL_SECONDS`
- `CUSTOMER_REFRESH_TOKEN_TTL_SECONDS`
- `ANTHROPIC_API_KEY`
- `CLERK_SECRET_KEY`
- `SENTRY_DSN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_RETURN_URL`
- `STRIPE_CONNECT_REFRESH_URL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`
- `TWILIO_MESSAGING_SERVICE_SID`
- `WORKER_ENABLED`
- `NOTIFICATION_WORKER_POLL_INTERVAL_MS`
- `NOTIFICATION_WORKER_BATCH_SIZE`

Notes:
- `BASE_DOMAIN` or `TENANT_DOMAIN_SUFFIX` is required by the API config.
- `JWT_SECRET` is still present in the config surface but current customer auth uses the access/refresh secret pair.
- `TWILIO_MESSAGING_SERVICE_SID` is used by the worker, not by the API.

## `apps/web/.env.local`
Used by:
- storefront Vite app

Current frontend vars:
- `VITE_API_BASE_URL`
- `VITE_SENTRY_DSN`
- `VITE_TENANT_DOMAIN_SUFFIX`

Notes:
- `VITE_API_BASE_URL` points the storefront at the API.
- `VITE_TENANT_DOMAIN_SUFFIX` drives subdomain tenant resolution in production.
- `TENANT_DOMAIN_SUFFIX` is also read by `apps/web/vite.config.ts` as a fallback, but use `VITE_TENANT_DOMAIN_SUFFIX` for clarity.

## `apps/admin/.env.local`
Used by:
- admin Vite app

Current frontend vars:
- `VITE_API_BASE_URL`

Notes:
- Admin auth itself is handled by Clerk in the app and backend, but the admin frontend currently does not read a local `VITE_CLERK_*` variable from the code paths inspected here.

## Render Service Vars
Set these in the Render API service:
- `NODE_ENV=production`
- `PORT`
- `DATABASE_URL`
- `BASE_DOMAIN` or `TENANT_DOMAIN_SUFFIX`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `CUSTOMER_ACCESS_TOKEN_TTL_SECONDS`
- `CUSTOMER_REFRESH_TOKEN_TTL_SECONDS`
- `ANTHROPIC_API_KEY`
- `CLERK_SECRET_KEY`
- `SENTRY_DSN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_RETURN_URL`
- `STRIPE_CONNECT_REFRESH_URL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`

Set these in the Render worker service if the worker is deployed separately:
- `NODE_ENV=production`
- `DATABASE_URL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_MESSAGING_SERVICE_SID`
- `WORKER_ENABLED=true`
- `NOTIFICATION_WORKER_POLL_INTERVAL_MS`
- `NOTIFICATION_WORKER_BATCH_SIZE`

Notes:
- Render services do not share a repo root `.env`; each service needs its own env configuration.
- API and worker can share some values, but set them per service.

## Vercel Project Vars
Set these in the storefront Vercel project:
- `VITE_API_BASE_URL`
- `VITE_SENTRY_DSN`
- `VITE_TENANT_DOMAIN_SUFFIX`

Set these in the admin Vercel project:
- `VITE_API_BASE_URL`

Notes:
- Vercel frontend env vars must use `VITE_` to be exposed to the browser bundle.
- Frontend projects should not receive backend secrets like Stripe secret keys, JWT secrets, Twilio auth tokens, or Clerk secret keys.

## Local Example Split

Root `.env`:
- backend, worker, and DB script values only

`apps/web/.env.local`:
- storefront `VITE_*` values only

`apps/admin/.env.local`:
- admin `VITE_*` values only

## Current Example Names

Root `.env`:
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/restaurant
BASE_DOMAIN=example.com
JWT_ACCESS_SECRET=changeme-access
JWT_REFRESH_SECRET=changeme-refresh
JWT_ISSUER=restaurant-platform
JWT_AUDIENCE=restaurant-platform-customers
CUSTOMER_ACCESS_TOKEN_TTL_SECONDS=900
CUSTOMER_REFRESH_TOKEN_TTL_SECONDS=2592000
ANTHROPIC_API_KEY=
CLERK_SECRET_KEY=
SENTRY_DSN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_RETURN_URL=http://localhost:5174/admin/stripe/return
STRIPE_CONNECT_REFRESH_URL=http://localhost:5174/admin/stripe/refresh
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
TWILIO_MESSAGING_SERVICE_SID=
WORKER_ENABLED=false
NOTIFICATION_WORKER_POLL_INTERVAL_MS=10000
NOTIFICATION_WORKER_BATCH_SIZE=10
```

`apps/web/.env.local`:
```env
VITE_API_BASE_URL=http://127.0.0.1:4000
VITE_SENTRY_DSN=
VITE_TENANT_DOMAIN_SUFFIX=easymenu.website
```

`apps/admin/.env.local`:
```env
VITE_API_BASE_URL=http://127.0.0.1:4000
```
