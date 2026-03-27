# Tenancy & Data Access Layer (Binding)

- Every table (except `Restaurant`) includes `restaurant_id` and is protected by Postgres RLS: `restaurant_id = current_setting('app.restaurant_id')::uuid`.
- Requests resolve tenant via subdomain or custom domain, then set `SET LOCAL app.restaurant_id = '<uuid>'` on the DB connection.
- The Data Access package (`packages/data-access`) exports tenant‑bound repositories. The raw Prisma client is not exported.
- Public repository APIs accept tenant‑agnostic inputs (e.g., `WithoutRestaurantId<T>`); the helper injects `restaurant_id` automatically.
- Helper ops: `scopeWhere`, `scopeCreate`, `scopeUpdate`, `scopeDelete` prevent leaks by construction.
- Any `as any` near TenantScope boundaries is a code‑review red flag.
- Integration tests assert cross‑tenant leakage is impossible.
