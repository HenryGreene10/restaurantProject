# ADR-0001: Enforce Tenancy at Data Access + Postgres RLS

## Status
Accepted — Binding

## Context
Multi‑tenancy cannot be bolted on later. Route‑level scoping is error‑prone; the database must reject cross‑tenant access.

## Decision
- Require `restaurant_id` on every tenant table.
- Set `SET LOCAL app.restaurant_id = '<uuid>'` per request/connection.
- Enable RLS; add policies `restaurant_id = current_setting('app.restaurant_id')::uuid`.
- Expose only tenant‑bound repositories from `packages/data-access`. Never export the raw Prisma client.
- Treat `as any` near TenantScope as a code‑review failure.

## Consequences
- Safer by default. Queries are structurally tenant‑scoped.
- Slight upfront complexity in repository helpers; large reduction in long‑term risk.
