# Architecture

Platform provides auth and color to the Rafters Studio surfaces. It is being rebuilt one part at a time, and nothing here is fixed before 1.0.

## What exists

- A pnpm workspace with one package, `apps/api`: a Hono app on Cloudflare Workers, mounted under `/api`, with a `GET /api/health` route.
- The worker `rafters-platform`, configured in `apps/api/wrangler.jsonc` and routed at `rafters.studio/api/*`. It is not deployed yet.
- The toolchain, Vite+ 1.0, configured in the root `vite.config.ts`. Every dependency version lives in the pnpm catalog in `pnpm-workspace.yaml`.

## Operations

| Command                       | What it does                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `pnpm install`                | Installs dependencies and, through the `prepare` script, the git hooks         |
| `pnpm exec vp check`          | Format check, lint, and type check (tsgo)                                      |
| `pnpm exec vp check --fix`    | Formats and applies lint fixes                                                 |
| `pnpm exec vp test`           | Runs the unit tests once (Vitest 5)                                            |
| `pnpm -C apps/api run types`  | Regenerates `Env` types from `wrangler.jsonc` into `worker-configuration.d.ts` |
| `pnpm -C apps/api run deploy` | Deploys the worker with `wrangler deploy`; the operator runs it                |

Each app keeps its tests in `test/`, mirroring its `src/` (`apps/api/src/index.ts` is tested by `apps/api/test/index.test.ts`).

Git hooks live in `.vite-hooks/`: pre-commit runs `vp staged` (checks on staged files), and pre-push runs `vp test`.

Tests run under plain Vitest, not in the Workers runtime, because Cloudflare's Vitest plugin does not support Vitest 5 yet. `.cf-future` lists every place that changes when it does.

## Color API

`GET /api/color/:oklch` serves a color's math and its intelligence. `:oklch` is `L.LLL-C.CCC-H` with H from 0 to 359 (for example `0.500-0.120-240`); anything else is a 400 with a message. The math comes from `@rafters/color-utils` (`buildColorValue`). The intelligence is six text fields and a `label`, written by Claude Sonnet and cached.

The body is `{ color, status, source, nearest?, error? }`:

- An exact key hit is `status: "found"`, `source: "cache"`.
- Otherwise the cached color nearest by deltaE-OK within 0.02 is `status: "approximate"`, `source: "cache"`, with `nearest: { key, deltaE }`.
- Otherwise the worker generates inline (no queue), stores the result, and returns `status: "found"`, `source: "generated"`.
- A generation failure is a 200 with the color, no `intelligence`, `status: "error"`, and `error`. A gateway 429 says "Color intelligence is busy; try again in a minute". Nothing is stored on failure.

The endpoint is anonymous with no per-client rate limit. Spend and request rate are capped at the gateway.

### Cache

The platform D1 database (binding `rafters_platform`) holds the table `color_cache`, one row per color: `key`, the OKLab coordinates, `label` (nullable), the six text fields, `model`, `created_at`. Migrations `0001_color_cache.sql` and `0002_color_cache_columns.sql` (which drops and recreates the table) are applied with wrangler. A UNIQUE index on `label COLLATE NOCASE` keeps labels distinct; a color whose label candidates all failed is stored with a NULL label.

The prompt carries the color's computed facts and the labels of up to 20 cached colors within deltaE-OK 0.1, and asks for exactly three ranked label candidates. The label is the first candidate that is unused and has no term from `src/color/banned-label-terms.ts`. If none pass, the model is asked once more with the rejected labels and reasons; if that fails too, the label is NULL and the failure is logged. If the insert loses a race on the label, the next passing candidate is used, else NULL.

### How colors are written

`.claude/agents/colorist.md` defines how every color is written: the fields, their word caps, the label rules, and the rules for every field. `docs/color-culture-reference.md` is a sourced cross-cultural reference, the only source for `culturalContext` (what a tone means across regions) and for regional conflicts in `usageGuidance` (for example red meaning "price up" in China and Taiwan). Both are the single source for two writers:

- The worker imports them as text (wrangler's Text rule for `*.md`; a matching plugin in `vite.config.ts` for tests) and builds its system prompt in `src/color/prompt.ts` from the colorist's writing rules plus the reference. The system prompt is sent with prompt caching, so repeated misses read it from cache. Generated text with a banned word or a number (other than "P3") is rejected like a failed generation.
- The `colorist` agent seeds the cache locally through Claude Code, in batches, from the same definition.

### Gateway and secrets

Claude is reached through the Cloudflare AI Gateway `rafters-color-intel`, using its Anthropic passthrough and the Anthropic key stored in the gateway under the alias `claude`. The worker never holds an Anthropic key. The gateway allows 50 requests per minute. The gateway id and alias are constants in `src/color/gateway.ts`.

Two secrets, read from `apps/api/.dev.vars` locally and set with `wrangler secret` in production:

| Secret             | Value                                                |
| ------------------ | ---------------------------------------------------- |
| `CF_API_KEY`       | The Cloudflare account id (the name is misleading)   |
| `CF_WORKER_AI_KEY` | The AI Gateway token, sent as `cf-aig-authorization` |

### Deploy steps (operator)

1. `pnpm -C apps/api exec wrangler d1 migrations apply rafters_platform --remote`
2. `pnpm -C apps/api exec wrangler secret put CF_API_KEY` and `pnpm -C apps/api exec wrangler secret put CF_WORKER_AI_KEY`
3. `pnpm -C apps/api run deploy`

## The previous version

`../platform-archive` is a snapshot of platform v1, without git history. Read it to see how something worked before, such as the color API. Its package.json and docs do not describe what it actually contained, so check the code itself.
