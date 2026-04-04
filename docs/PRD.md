# PRD Placeholder

The original PRD content is still missing from this file.

Current implementation status note for handoff:
- Admin storefront customization is live.
- Admin menu drag-and-drop and immediate-save visibility/featured/sold-out controls are live.
- Admin AI assistant first action slice is live through `POST /v1/assistant/command`.
- Assistant currently supports:
  - set item visibility
  - set item featured state
  - set category visibility
  - add item
  - add category
  - update item
  - set item price
  - update brand config text fields
- Assistant resolves names against fresh tenant menu state, now with fuzzy matching, handles clarification turns, and can execute multi-action commands.
- Assistant is now a persistent chat surface in the admin dashboard rather than a tab.
- Customer checkout/status slice is substantially live now:
  - direct pickup checkout with name + phone only
  - dedicated order-status page
  - live status polling
  - cart/customer draft persistence
- Customer order status is now fully public through `GET /v1/orders/:orderId/status`.
- Storefront active-order banner is implemented via localStorage.
- Kitchen dashboard is built and running in `apps/kiosk`.
- Current notable frontend limitation:
  - `apps/web` tenant slug is still resolved from frontend state with default `joes-pizza`, not from the URL yet.

Current blockers to first paying customer:
- URL-based tenant routing
  - storefront still resolves tenant from hardcoded frontend state
- Admin authentication
  - no login system yet for restaurant owners
- Stripe Connect
  - no payment processing / payout flow yet
- Real hosting and deployment
- Image storage migration
  - uploaded images are still stored as data URLs and need to move to R2

Use `docs/COMPACTION.md` as the current handoff source of truth until the real PRD is restored here.
