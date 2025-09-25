@querymon/api
=================

Hono + tRPC + Drizzle API service.

- Framework: Hono (Node adapter)
- RPC: tRPC (mounted at `/trpc`)
- ORM: Drizzle ORM
  - Dev: SQLite file at `apps/api/var/dev.db`
  - Prod: Turso (libSQL) via `@libsql/client`

Scripts
-------

- `pnpm --filter @querymon/api dev` – start dev server with tsx
- `pnpm --filter @querymon/api build && pnpm --filter @querymon/api start` – build + run
- `pnpm --filter @querymon/api db:generate` – generate migrations from schema
- `pnpm --filter @querymon/api db:push` – push schema to DB (uses Turso if env set, else local file)

Env
---

Copy `.env.example` to `.env` and set `TURSO_*` vars in staging/prod. `PORT` defaults to 8787.

Endpoints
---------

- `GET /healthz` → `{ ok: true }`
- tRPC at `/trpc`. Example procedures:
  - `health` – health check
  - `favorites.list` – list favorites
  - `favorites.add` – add favorite
  - `favorites.remove` – remove favorite

