# Architecture Overview

This document locks foundational decisions and describes how multi‑tenancy, auth, payments, notifications, and hosting will work. No application code will be written until the database schema is reviewed and approved.

## Stack Decisions (Locked)
- Runtime: Node.js + TypeScript
- Backend framework: Fastify (Hono considered; Fastify chosen for plugin ecosystem, mature typings, perf)
- Database: PostgreSQL + Prisma
- Frontend: React + Vite PWA
- Styling: Tailwind with CSS variables for per‑tenant brand config theming
- Auth: Custom JWT with Twilio Verify for phone OTP (customers); email+password for admins
- SMS: Twilio Verify for OTP, Twilio Messaging for order notifications
- Payments: Stripe Connect Standard + Stripe Billing
- Hosting target: Railway or Render for backend; Vercel for frontend, specifically to leverage automated custom domain SSL (ACME)
- Monorepo tooling: Turborepo

## Multi‑Tenancy
- Tenants are restaurants. Every record has `restaurant_id` (UUID) or is directly the restaurant record.
- Host‑based routing: custom domain via `Domain` table or `<slug>.<base_domain>`.
- Data isolation:
  - Postgres Row‑Level Security (RLS) with `current_setting('app.restaurant_id')` enforced per connection.
  - A mandatory data‑access helper sets `SET LOCAL app.restaurant_id = '<uuid>'` at request start; all queries run under this setting.
  - No query bypasses the helper. Code review and lint rules enforce this.

## Brand Config
- Per‑tenant JSON config (colors, fonts, logo) loaded at runtime; mapped to CSS variables and Tailwind theme extensions.

## Auth
- Admin: email/password → JWT (server‑issued).
- Customer: phone number + OTP via Twilio Verify; on success, issue a short‑lived JWT; refresh via silent re‑verify or refresh token.

## Payments
- Stripe Connect Standard for restaurant payouts; restaurant onboards via hosted Connect flow.
- Stripe Billing for our SaaS subscription.
- Orders store PaymentIntent id for reconciliation; refunds initiated by restaurant.

## Notifications
- Web Push (PWA) with VAPID; SMS fallback via Twilio for critical order status events.

## Custom Domains & SSL
- Frontend on Vercel with automatic certs for custom domains (or Cloudflare for SaaS / Caddy if self‑hosting). Backend on Railway/Render behind managed TLS.

## Operational Guardrails
- No feature merges without tenant‑scoped integration tests.
- RLS policies applied before any production data.

