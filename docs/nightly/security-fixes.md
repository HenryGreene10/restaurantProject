# Security fixes — 2026-05-05

Three separate PRs address the critical issues identified in the V2 sprint plan.
Each is on its own branch and must be merged independently.

---

## PR 1 — Server-side price validation

**Branch:** `security/server-side-price-validation`  
**Files changed:** `apps/api/src/routes/checkouts.ts`, `packages/data-access/src/repositories/tenant.ts`

### Problem

`POST /v1/checkouts/create-payment-intent` accepted `items[]` from the client
and used the caller-supplied `unitPriceCents` (and `priceDeltaCents` on modifiers)
to compute the Stripe payment-intent amount. A malicious client could submit
`unitPriceCents: 1` for a $25 dish and Stripe would charge $0.01.

The same fallback existed in the discount pre-calculation: the new-member discount
percentage was applied against a client-sourced subtotal rather than the real one.

### Fix

`normalizeOrderItems` in `packages/data-access/src/repositories/tenant.ts` now:

- Resolves `unitPriceCents` exclusively from `variant.priceCents` or
  `menuItem.basePriceCents` — the client-supplied value is discarded.
- Forces `priceDeltaCents = 0` on modifier selections that have no verifiable
  `optionId` (cannot be validated against a DB record).

A new `computeCartTotal` accessor was added to the `checkouts` object so the
checkout route can call `normalizeOrderItems` once before session creation to get
the correct DB-sourced subtotal for the new-member discount calculation.

### Attack vector closed

Any client submitting tampered `unitPriceCents` values will now be charged the
correct menu price. The Stripe payment-intent amount is derived entirely from DB
records.

---

## PR 2 — Cross-tenant admin isolation

**Branch:** `security/cross-tenant-admin-isolation`  
**Files changed:** `apps/api/src/app.ts`

### Problem

Admin routes are scoped to a tenant via `req.tenant.id`. The tenant middleware
already derives `req.tenant` from `req.adminUser.restaurantId` for authenticated
admin requests, but there was no explicit application-layer assertion that the two
values match. Defense against cross-tenant access relied solely on PostgreSQL RLS.

If the middleware chain were ever modified (e.g. a new route registered before
`tenantMiddleware`, or a future middleware that reads `x-tenant-slug` before
`req.adminUser` is set), RLS would be the only guard.

### Fix

A dedicated middleware is now registered in `createApp()` immediately after
`tenantMiddleware`:

```ts
app.use('/admin', (req, res, next) => {
  if (req.adminUser && req.tenant && req.adminUser.restaurantId !== req.tenant.id) {
    return res.status(403).json({ error: 'Admin restaurant does not match request tenant' })
  }
  return next()
})
```

This fires on every `/admin` request. Under normal operation it always passes
(since `tenantMiddleware` already sets `req.tenant.id = req.adminUser.restaurantId`),
but it provides an explicit, readable application-layer invariant and will catch
any future regression where the two diverge before the request reaches a route
handler.

### What was NOT changed

RLS is still in place and still enforced at the DB level. This middleware is
defense-in-depth, not a replacement.

---

## PR 3 — Email bridge removal preparation

**Branch:** `security/email-bridge-backfill`  
**Files added:** `scripts/backfill-clerk-ids.ts`

### Problem

`claimLegacyAdminAccessByEmail` in `packages/data-access/src/repositories/platform.ts`
is called as a fallback during admin login when `findAdminAccessByClerkUserId`
returns no match. It looks up an `AdminUser` row by email and overwrites its
`clerkUserId` with the currently-authenticating Clerk user's ID.

This means: **any Clerk account whose primary email matches a known admin email
can silently claim ownership of that restaurant** on their first login attempt.

### What was done in this PR

The email bridge has NOT been removed yet. `scripts/backfill-clerk-ids.ts` was
written and committed for review. It must be:

1. **Reviewed** by the team.
2. **Run in dry-run mode** against production to identify stale rows:
   ```
   DATABASE_URL=... CLERK_SECRET_KEY=... tsx scripts/backfill-clerk-ids.ts
   ```
3. **Run in live mode** once the dry-run output looks correct:
   ```
   DATABASE_URL=... CLERK_SECRET_KEY=... DRY_RUN=false tsx scripts/backfill-clerk-ids.ts
   ```
4. The bridge can be removed only when the script exits with zero missing,
   ambiguous, and error rows.

### Script behaviour

For every `AdminUser` row the script:

- Calls `clerk.users.getUser(storedClerkUserId)` to verify the ID is still active.
- If stale (404), calls `clerk.users.getUserList({ emailAddress: [email] })`.
- If exactly one Clerk user matches, updates the DB row.
- If zero or multiple Clerk users match, logs a warning and skips (manual action required).

Default is dry-run (`DRY_RUN=true`). Set `DRY_RUN=false` to apply changes.

### Next step (after script runs clean)

Remove the email-bridge fallback from `requireClerkAuth` in
`apps/api/src/middleware/clerk-auth.ts` (lines 70–78) and delete
`claimLegacyAdminAccessByEmail` from `packages/data-access/src/repositories/platform.ts`.
That removal should be its own PR.

---

## PR creation links

The `gh` CLI was not available in this environment. Open these URLs to create
each PR against `main`:

- PR 1: `https://github.com/HenryGreene10/restaurantProject/pull/new/security/server-side-price-validation`
- PR 2: `https://github.com/HenryGreene10/restaurantProject/pull/new/security/cross-tenant-admin-isolation`
- PR 3: `https://github.com/HenryGreene10/restaurantProject/pull/new/security/email-bridge-backfill`
