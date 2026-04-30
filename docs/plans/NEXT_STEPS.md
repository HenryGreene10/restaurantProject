# Next Steps

_Last updated: 2026-04-29_

The project completed a full codebase audit on 2026-04-29. The V2 sprint plan lives at:

**[docs/plans/V2_SPRINT_PLAN.md](./V2_SPRINT_PLAN.md)**

---

## Immediate Next Actions (Sprint 0 + Sprint 1 Start)

Before writing any new feature code:

1. **Add ESLint + Prettier** (`package.json` root config + `lint-staged` pre-commit hook)
2. **Add GitHub Actions CI** (lint → typecheck → build on PR)
3. **Rate limit `/auth/customer/request-otp`** (`express-rate-limit`, 5 req / 15 min per IP+phone)
4. **Sanitize AI assistant errors** (log stack server-side, return safe message to client)
5. **Handle Stripe `payment_intent.payment_failed` webhook** (mark checkout failed, surface error to customer)

---

## Completed (pre-V2 audit)

- Stripe Connect Phase 1 + Phase 2 (onboarding, direct-charge checkout, webhook-authoritative order creation)
- Clerk-backed admin authorization and self-serve restaurant onboarding
- Apple Pay domain registration
- Cloudflare R2 image storage (admin uploads no longer use base64 data URLs)
- Customer OTP auth + JWT access/refresh token flow
- Full order FSM (PENDING → CONFIRMED → PREPARING → READY → COMPLETED)
- SMS notification worker with retry logic
- AI assistant (26 tools, fuzzy entity resolution, multi-turn clarification)
- Mobile storefront polish (card layout, sticky cart, category chips)
- Loyalty program backend (PUNCH_CARD + POINTS schema + admin config)
- Promotion system backend (PERCENT_OFF / AMOUNT_OFF / FREE_ITEM / FREE_DELIVERY)
- Kitchen dashboard (kiosk app, Clerk-gated, full status progression, tablet UI)
- Landing page redesign (forest green palette, real screenshots)
