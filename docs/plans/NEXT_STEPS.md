# Next Steps

## Immediate Launch Backlog

1. Run full mobile QA.
   - storefront browsing and category navigation
   - cart drawer behavior
   - Stripe checkout flow
   - admin dashboard usability on phone
   - kitchen tablet workflow
2. Build receipt printing.
   - printable ticket layout
   - printer integration path
   - kitchen/admin operational testing
3. Build loyalty / rewards UI.
   - customer-facing reward presentation
   - admin configuration surface
   - redemption UX rules
4. Complete production payment QA.
   - Render API + Vercel storefront/admin smoke test
   - connected-account webhook verification
   - live domain checkout validation on `easymenu.website`
   - refund / failure-path validation
5. Finish auth migration cleanup.
   - backfill existing admins with real `clerkUserId` links
   - remove temporary email auto-link bridge
6. Harden operational polish.
   - image storage migration away from data URLs
   - richer promo / loyalty marketing surfaces
   - broader AI assistant command coverage

## Recently Completed

- Stripe Connect Phase 1 onboarding flow
- Render API bundling and CommonJS deploy path
- Vercel deployment for admin and storefront
- Stripe Phase 2 direct-charge checkout flow
- Clerk-backed admin authorization and self-serve restaurant onboarding
