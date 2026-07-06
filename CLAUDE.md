# Rafters Studio Platform

Infrastructure for all Rafters surfaces. Auth, database, API, middleware.

## Boot

This file is a bootstrap, not a doctrine store. Doctrine lives in legion. Walk it before touching anything:

1. `legion whoami` -- who you are. Injected at session start; read it.
2. `legion whatami --repo platform` -- the operating contract: migrations doctrine, schema pattern, testing doctrine.
3. `legion recall --repo platform --context "..."` -- before grep, always.
4. `legion consult --context "..."` -- when the answer might live with another agent.

If a convention seems missing, it is in the reflections, not absent. Recall before reinvent.

## Basic architecture

Three Workers, one D1:

- `apps/web` -- the API. Hono on Cloudflare Workers, `/api/*`. Auth (better-auth: passkeys + OAuth2 + OTP, no email/password ever), color pipeline, uncertainty tracking, crons.
- `apps/ctrl` -- the admin surface. React + TanStack Router, talks to `apps/web`.
- `apps/inbox` -- the email worker. CF Email Routing in, D1 + R2 out, never-reject doctrine.

Invariants the contract enforces (full doctrine via `whatami`):

- D1 via Drizzle as query builder only; **wrangler owns all migrations**
- Zod is source of truth; every Drizzle schema file gets a `.zod.ts` companion
- `wrangler types` generates Env; never hand-typed
- OXC for lint/format, TypeScript 6, pnpm, UUIDv7
- Tests live in `tests/`, never colocated: `.test.ts` (Vitest) / `.spec.ts` (Vitest Browser) / `.e2e.ts` (Playwright). `pnpm test` / `test:spec` / `test:e2e`.
