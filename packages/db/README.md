# @repo/db

- Prisma schema for multi-tenant Postgres with RLS
- `withTenant()` wraps requests and sets `app.restaurant_id` per-connection
- Add RLS SQL policies in your migrations (see infra notes)
