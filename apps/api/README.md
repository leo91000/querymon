@querymon/api
=================

Hono + tRPC + Drizzle API service.

- Framework: Hono (Node adapter)
- RPC: tRPC (mounted at `/trpc`)
- ORM: Drizzle ORM (PostgreSQL)
  - Drivers: `pg` (node-postgres) or `neon` (HTTP). Select via `DB_DRIVER`.

Scripts
-------

- `pnpm --filter @querymon/api dev` – start dev server with tsx
- `pnpm --filter @querymon/api build && pnpm --filter @querymon/api start` – build + run
- `pnpm --filter @querymon/api db:generate` – generate migrations from schema
- `pnpm --filter @querymon/api db:push` – push schema to DB

Env
---

Copy `.env.example` to `.env` and set:

- `DATABASE_URL=postgres://user:pass@host:port/db` (used for both drivers)
- `DB_DRIVER=pg | neon` (defaults to `pg`)
- `PORT` defaults to 8787

Endpoints
---------

- `GET /healthz` → `{ ok: true }`
- tRPC at `/trpc`.
