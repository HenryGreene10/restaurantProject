# Dev Notes

## Start services

- `docker compose -f infra/docker-compose.yml up -d`

## Create schema and generate client

- `npm install`
- `npm -w packages/db run prisma:generate`

## Apply RLS policies (once)

- Load `packages/db/prisma/rls.sql` into your Postgres (psql or GUI).

## Seed demo tenant (optional)

- Load `packages/db/prisma/dev-seed.sql` into Postgres. Then add `demo.localhost` to your hosts file if needed.

## Run API

- `npm -w apps/api run dev`

Now, hitting `http://demo.localhost:4000/v1/menu` should return demo data (if Host header resolves to demo.localhost).
