# Architecture

Platform provides auth and color to the Rafters Studio surfaces. It is being rebuilt one part at a time, and nothing here is fixed before 1.0.

## What exists

- A pnpm workspace with one package, `apps/api`: a minimal Hono app with a `GET /health` route.
- The toolchain, Vite+ 1.0, configured in the root `vite.config.ts`.

## Operations

| Command                    | What it does                                                           |
| -------------------------- | ---------------------------------------------------------------------- |
| `pnpm install`             | Installs dependencies and, through the `prepare` script, the git hooks |
| `pnpm exec vp check`       | Format check, lint, and type check (tsgo)                              |
| `pnpm exec vp check --fix` | Formats and applies lint fixes                                         |
| `pnpm exec vp test`        | Runs the unit tests once (Vitest 5)                                    |

Git hooks live in `.vite-hooks/`: pre-commit runs `vp staged` (checks on staged files), and pre-push runs `vp test`.

Tests run under plain Vitest, not in the Workers runtime, because Cloudflare's Vitest plugin does not support Vitest 5 yet. `.cf-future` lists every place that changes when it does.

## The previous version

`../platform-archive` is a snapshot of platform v1, without git history. Read it to see how something worked before, such as the color API. Its package.json and docs do not describe what it actually contained, so check the code itself.
