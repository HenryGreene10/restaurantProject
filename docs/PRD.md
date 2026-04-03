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
- Assistant resolves names against fresh tenant menu state, now with fuzzy matching, and asks for clarification on ambiguous matches before mutating.
- Assistant is now a persistent chat surface in the admin dashboard rather than a tab.
- Customer checkout/status slice is substantially live now:
  - OTP in checkout
  - dedicated order-status page
  - live status polling
  - cart/customer draft persistence
- Customer order lookup route is live at `GET /v1/orders/:orderId`.
- Current notable gap:
  - kitchen dashboard UI is not built yet, though backend kitchen routes and the `apps/kiosk` scaffold already exist.
- Current notable frontend limitation:
  - `apps/web` tenant slug is still resolved from frontend state with default `joes-pizza`, not from the URL yet.

Use `docs/COMPACTION.md` as the current handoff source of truth until the real PRD is restored here.
