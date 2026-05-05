# Judgment Calls & Review Notes

Items that required a non-obvious decision or that need human review.

---

## Security: claimLegacyAdminAccessByEmail bridge removal

**Status:** PR open (`security/remove-email-bridge`) — cannot auto-merge because `gh` CLI is not authenticated in this session.

**Action needed:** Review and merge the PR at:
https://github.com/HenryGreene10/restaurantProject/pull/new/security/remove-email-bridge

---

## Pre-existing test suite issues (not introduced by this work)

Two failure patterns exist in the test suite before these changes:

1. **Timeout on first test in each suite file** — vitest's `pool: 'forks'` mode + dynamic `await import('../app')` inside test bodies means the first test pays ~25s module transform cost. The configured `testTimeout: 20000` fires before the test completes. Tests 2–N in the same file share the cached module and pass. This is a structural issue in the test file pattern, not a logic bug.

2. **`assistant.integration.test.ts` all fail with 401** — All 11 assistant tests send requests to `/v1/assistant/command` without an `Authorization: Bearer` header. `requireClerkAuth` returns 401 on "Missing Clerk bearer token" before `verifyToken` is called. These tests appear to have been broken independently of this work. Needs an `Authorization` header added to each supertest call.

Neither issue is caused by changes in this remediation pass.

---

## Structured logging: customerPhone removed from loyalty error log

The original `awardLoyaltyPoints` error log in `stripe-webhook.ts` included `customerPhoneSnapshot`. Phone numbers are PII; removed from structured log. The `orderId` and `customerId` are sufficient to trace the failure. No data was being persisted — this only affects log output.

---

## Redis worker: deferred

Replacing the polling worker with Redis pub/sub would eliminate the 2s polling latency on SMS notifications. However, it requires adding a Redis service to Render, adding the `ioredis` or `redis` package, and changing the worker architecture significantly. At 1 pilot restaurant, the 2s polling latency is within the 30s NFR and the Postgres polling overhead is negligible. Deferred until a second restaurant is onboarded and the latency gap becomes measurable.

---

## Pagination: backward compatibility decision

`listItems` pagination added as **opt-in** (omitting `limit`/`cursor` returns all items as before). This keeps the admin frontend working unchanged. The frontend should adopt `limit=100&cursor=...` when it handles large catalogs. Admin orders list endpoint added with pagination built in from day one (new endpoint, no backward compat concern).

---

## Webhook idempotency: remaining race condition

The `ORDER_CREATED` early-exit in the webhook prevents re-processing on Stripe retries (the common case). A true concurrent-delivery race is still possible: two webhook deliveries arriving within milliseconds of each other could both pass the status check before either commits. The data layer's `createdOrderId` guard in `createOrderFromCheckoutSession` provides a second layer, but it's not atomic (READ COMMITTED isolation). Fixing this properly requires either a `SELECT FOR UPDATE` on the checkout session row or a unique constraint on `CheckoutSession.createdOrderId`. A DB migration is needed for the constraint approach — deferring to a future migration task.

---
