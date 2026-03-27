# First Vertical Slice — Definition of Done

Complete only when ALL are true and tested:
1) A restaurant can be created with a brand config object.
2) Tenant resolution middleware correctly identifies restaurant from subdomain or header.
3) Every data access query is provably tenant‑scoped; cross‑tenant leakage is impossible under RLS tests.
4) A customer can receive a real Twilio OTP, verify it, and receive a session token.
5) A menu with categories, items, variants, and modifiers can be created and retrieved scoped to a tenant.
6) Basic integration tests cover the above and run green in CI.

Do not begin the ordering flow until all six pass.
