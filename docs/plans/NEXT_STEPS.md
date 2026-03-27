# Next Steps (Phase 1)

1) Finalize database schema (see SCHEMA_PROPOSAL.md) and RLS SQL.
2) Create packages: `data-access` (tenant‑safe repositories) and `tenant-context` (tenant resolution, connection scoping).
3) Seed script skeleton per SEEDING.md (joes‑pizza seq 1003; sunrise‑cafe seq 2003).
4) Implement Twilio Verify OTP flow endpoints (request/verify/refresh) with minimal JWT issuance.
5) Wire Stripe Connect Standard onboarding link + webhooks (Billing later in Phase 1).
6) Basic admin endpoints for menu/category/item/variants/modifiers; no UI yet.
7) Kitchen polling endpoint (to be replaced by real‑time in later phase).
8) Integration tests for tenant isolation, OTP, and menu CRUD.
