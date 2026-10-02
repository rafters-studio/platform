# Architecture

Platform provides auth and color to the Rafters Studio surfaces. It is being rebuilt one part at a time, and nothing here is fixed before 1.0.

## What exists

- A pnpm workspace with one package, `apps/api`: a Hono app on Cloudflare Workers, mounted under `/api`, with a `GET /api/health` route.
- The worker `rafters-platform`, configured in `apps/api/wrangler.jsonc` and routed at `rafters.studio/api/*`. It is not deployed yet.
- The toolchain, Vite+ 1.0, configured in the root `vite.config.ts`. Every dependency version lives in the pnpm catalog in `pnpm-workspace.yaml`.

## Operations

| Command                    | What it does                                                                   |
| -------------------------- | ------------------------------------------------------------------------------ |
| `pnpm install`             | Installs dependencies and, through the `prepare` script, the git hooks         |
| `pnpm exec vp check`       | Format check, lint, and type check (tsgo)                                      |
| `pnpm exec vp check --fix` | Formats and applies lint fixes                                                 |
| `pnpm exec vp test`        | Runs the unit tests once (Vitest 5)                                            |
| `pnpm -C apps/api types`   | Regenerates `Env` types from `wrangler.jsonc` into `worker-configuration.d.ts` |
| `pnpm -C apps/api deploy`  | Deploys the worker with `wrangler deploy`; the operator runs it                |

Each app keeps its tests in `test/`, mirroring its `src/` (`apps/api/src/index.ts` is tested by `apps/api/test/index.test.ts`).

Git hooks live in `.vite-hooks/`: pre-commit runs `vp staged` (checks on staged files), and pre-push runs `vp test`.

Tests run under plain Vitest, not in the Workers runtime, because Cloudflare's Vitest plugin does not support Vitest 5 yet. `.cf-future` lists every place that changes when it does.

## The previous version

`../platform-archive` is a snapshot of platform v1, without git history. Read it to see how something worked before, such as the color API. Its package.json and docs do not describe what it actually contained, so check the code itself.
