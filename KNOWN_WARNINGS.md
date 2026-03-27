# Known Warnings, Pitfalls, and NFRs (Binding)

## Pitfalls (Read Before Coding)

1) Multi‑Tenant Mistake That Kills Projects
- Never bolt on multi‑tenancy later. Every query is scoped by `restaurant_id` via a mandatory data‑access helper that injects the tenant and Postgres RLS. No route‑level scoping alone. Never bypass the helper.

2) Stripe Connect Modes
- Standard vs Custom. We choose Standard to reduce compliance friction and use hosted onboarding. Reevaluate only with clear business need; switching later is painful.

3) PWA Push on iOS
- iOS requires the PWA to be installed to receive push (iOS 16.4+). Always provide SMS fallback for order status updates. Do not rely on push alone.

4) AI Assistant Context Window
- Limit context. Send summarized stats, recent orders, and full menu—avoid raw historical exports. Watch token costs and latency.

5) Custom Domains & SSL
- Automate SSL (Let’s Encrypt/ACME). Prefer Vercel/Cloudflare/Caddy patterns; never manage certs manually per restaurant.

6) Don’t Build Native Too Early
- Ship PWA first. Only start native after 5 paying PWA customers.

7) Menu Data Is Messy
- Support variants, modifier groups (single/multi, min/max), half‑and‑half, combos. Aim for flexible schema.

8) Phone Number as Identity
- Customers authenticate via phone + OTP; email is optional for marketing.

## Non‑Functional Requirements (Binding)
- Order placement to kitchen screen: under 2 seconds E2E.
- Kitchen screen: resilient to Wi‑Fi drops with optimistic UI and auto‑reconnect.
- Order status SMS: sent within 30 seconds of status change.
- Restaurant admin dashboard: fully operable on mobile.
