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
- Assistant resolves names against fresh tenant menu state and asks for clarification on ambiguous matches before mutating.
- Customer checkout/status slice is still incomplete:
  - OTP in checkout
  - dedicated order-status page
  - live status polling
  - cart/customer draft persistence

Use `docs/COMPACTION.md` as the current handoff source of truth until the real PRD is restored here.
