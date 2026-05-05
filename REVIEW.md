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
