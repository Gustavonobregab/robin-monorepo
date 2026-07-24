# Robin — Monorepo

Compression-as-a-service: audio, image and text compression jobs behind a
dashboard and a public API (`/v1`, API-key auth).

## Structure

```
robin-monorepo/
├── api/          # Backend — Elysia + Bun (conventions: api/CLAUDE.md)
├── dashboard/    # Frontend — Next.js (conventions: dashboard/CLAUDE.md)
├── docs-site/    # Public API docs (Mintlify)
├── docs/         # Internal research notes and specs
├── deploy/       # Dockerfile, docker-compose, nginx, post-receive hook (VPS deploy)
└── package.json  # Workspace root
```

**Sub-guides — read the one for the workspace you are changing:**
`api/CLAUDE.md` (modules, ApiError, credits/billing, queues/workers, idempotency) ·
`dashboard/CLAUDE.md` (http layer, error funnel, color tokens, loading/empty states)

## Running

From the repo root:

```bash
bun run dev           # API dev server
bun run dev:dashboard # Dashboard dev server
bun run worker        # BullMQ worker
bun run seed          # Seed plans (api/src/scripts/seed-plans.ts, idempotent upserts)
```

Or inside each workspace directly:

```bash
cd api && bun run dev
```

## API (`api/`)

**Stack:** Bun, Elysia, MongoDB (Mongoose), Redis (ioredis), BullMQ, better-auth, Anthropic SDK

**Source layout:**

```
api/src/
├── config/       # DB, Redis, Auth, Storage setup (validate env at import)
├── middlewares/  # Elysia middleware (auth.ts, credits.ts)
├── modules/      # Feature modules (see below)
├── queues/       # BullMQ queue definitions
├── utils/        # Shared helpers
├── worker/       # BullMQ worker entrypoint
└── server.ts     # App entrypoint
```

## File Naming

- **kebab-case** for all files and directories
- Module files follow `<module>.<layer>.ts` pattern:
  - `users.routes.ts` — Elysia route definitions
  - `users.service.ts` — business logic
  - `users.model.ts` — Mongoose model/schema
  - `users.types.ts` — TypeScript types/interfaces for that module
- Config files: single word (`database.ts`, `redis.ts`, `auth.ts`)
- Middleware files: single concept (`api-key.ts`, `idempotency.ts`)

## Module Structure

Each feature lives under `api/src/modules/<name>/`:

```
modules/users/
├── users.routes.ts
├── users.service.ts
├── users.model.ts
└── users.types.ts
```

Not every module needs all four files — add only what's needed.
