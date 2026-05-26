# apps/web Deploy Runbook

The platform Worker. API only -- no frontend. Lives at `rafters.studio/api/*`.

## Topology

| Surface             | Worker / deploy           | Route                                      |
| ------------------- | ------------------------- | ------------------------------------------ |
| Marketing (apex)    | shingle (separate deploy) | `rafters.studio/*` catchall                |
| Platform API        | apps/web                  | `rafters.studio/api/*`                     |
| Inbound email       | apps/inbox                | (no HTTP route -- CF Email Routing target) |
| ctrl operations app | apps/ctrl (Astro deploy)  | `rafters.studio/ctrl/*`                    |

Cloudflare picks the most-specific route, so the three HTTP workers coexist on the apex without conflict. Never `custom_domain: true` at the apex.

**Why apps/inbox is a separate worker:** CF Email Routing's UI only lists workers whose default export is exclusively `email` -- no `fetch`, no `scheduled`. apps/inbox satisfies that constraint; apps/web cannot (it has `fetch` + `scheduled`). Both workers bind to the same D1 and R2 buckets; isolation is at the dispatch layer, not the data layer. See legion reflection 019e6522-ad66 for the full constraint.

## Required production secrets

Provision via `wrangler secret put <NAME>` from `apps/web/`. Required for the worker to function:

| Secret                 | What it is                                                         | Source                            |
| ---------------------- | ------------------------------------------------------------------ | --------------------------------- |
| `BETTER_AUTH_SECRET`   | Session signing secret for better-auth                             | Generate: `openssl rand -hex 32`  |
| `BETTER_AUTH_URL`      | Public origin (e.g. `https://rafters.studio`)                      | Static                            |
| `GITHUB_CLIENT_ID`     | GitHub OAuth app client id                                         | github.com developer settings     |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret                                     | github.com developer settings     |
| `POLAR_ACCESS_TOKEN`   | Polar org access token (for SDK)                                   | polar.sh dashboard                |
| `POLAR_WEBHOOK_SECRET` | Polar webhook signing secret                                       | polar.sh dashboard, per webhook   |
| `RESEND_API_KEY`       | Resend API key for outbound (OTP delivery)                         | resend.com dashboard              |
| `CF_API_KEY`           | Cloudflare account id (32-hex; misnamed; used as gateway URL slug) | dash.cloudflare.com               |
| `CF_WORKER_AI_KEY`     | Cloudflare AI Gateway authorization Bearer (NOT an Anthropic key)  | dash.cloudflare.com -> AI Gateway |

**Note on naming**: `CF_API_KEY` and `CF_WORKER_AI_KEY` are misnamed for historical reasons. `CF_API_KEY` is the **account id**; `CF_WORKER_AI_KEY` is the **AI Gateway auth token**. The Anthropic key is BYOK-stored on the gateway under alias `colors` -- never lives in the worker env. See reflections 019e2d27 and 019e2d67 for the full path.

Non-secret vars live in `wrangler.jsonc` `vars`:

| Var          | Value                    |
| ------------ | ------------------------ |
| `FROM_EMAIL` | `noreply@rafters.studio` |

## D1 migrations

Wrangler owns all D1 migrations. Drizzle is a query builder only. **Never** use `drizzle-kit push` or `drizzle-kit migrate` against D1.

```bash
cd apps/web

# Inspect what's pending against prod
pnpm exec wrangler d1 migrations list rafters --remote

# Apply all pending migrations to prod
pnpm exec wrangler d1 migrations apply rafters --remote
```

Current migrations (as of writing):

| File                            | What                                         |
| ------------------------------- | -------------------------------------------- |
| `0000_normal_micromacro.sql`    | better-auth tables                           |
| `0001_ctrl-preferences.sql`     | ctrl preferences                             |
| `0002_uncertainty_engine.sql`   | uncertainty + calibration tables             |
| `0003_mail_inbox.sql`           | 10 mail inbox tables (#123) + system mailbox |
| `0004_audit_polar_event_id.sql` | polar_event_id column + UNIQUE index (#124)  |

When adding a migration: `pnpm exec wrangler d1 migrations create rafters <name>` (creates the next-numbered file). Edit. Then `apply --remote`.

## CF Email Routing (inbound)

Inbound mail flows through CF Email Routing into `rafters-inbox` (apps/inbox). The worker's default export is exclusively `email` -- CF's "Send to a Worker" dropdown only lists workers shaped that way.

1. Cloudflare dashboard -> Email -> Email Routing -> Routing rules
2. Add a custom address: `inbox@rafters.studio` (or chosen)
3. Action: **Send to a Worker** -> `rafters-inbox`
4. Save and verify the route shows green

Or via wrangler from `apps/inbox/`:

```bash
pnpm exec wrangler email routing rules create rafters.studio \
  --action-type worker --action-value rafters-inbox \
  --match-type literal --match-field to --match-value inbox@rafters.studio
```

Deploy `rafters-inbox` before creating the routing rule. CF's behavior when a rule targets a missing worker is undocumented (best to not find out the hard way).

After provisioning, send a test email to the address. Verify:

- A blob lands in R2 at `messages/<sha256>/raw.eml` in the `rafters-email` bucket
- A row appears in D1 `inbox_message` with the matching `messageId` header

If parsing fails, the raw is stored at `parse-failed/<sha256>/raw.eml` with no D1 row -- so CF Email Routing does not retry indefinitely.

## AI Gateway (BYOK)

Color intelligence routes through a Cloudflare AI Gateway named `color-vocab` with a stored Anthropic key under BYOK alias `colors`.

The Anthropic SDK is pointed at the gateway URL:

```ts
new Anthropic({
  apiKey: env.CF_WORKER_AI_KEY, // gateway auth token
  baseURL: `https://gateway.ai.cloudflare.com/v1/${env.CF_API_KEY}/color-vocab/anthropic`,
  defaultHeaders: { "cf-aig-byok-alias": "colors" },
});
```

If the gateway is recreated or renamed: update the `GATEWAY` constant in `apps/web/src/lib/color/intelligence.ts` and re-deploy.

## Deploy

Two workers, two deploys. Order doesn't matter -- they're independent.

```bash
# Pre-flight (from platform root)
pnpm typecheck
pnpm test

# apps/web (API)
cd apps/web
pnpm exec wrangler deploy --dry-run
pnpm exec wrangler deploy

# apps/inbox (inbound email)
cd ../inbox
pnpm exec wrangler deploy --dry-run
pnpm exec wrangler deploy
```

Post-deploy verification:

```bash
# Health
curl https://rafters.studio/api/health
# -> {"status":"ok"}

# Color (adhoc -- no AI cost)
curl "https://rafters.studio/api/color/0.511-0.262-277?adhoc=true" | jq .status
# -> "found"
```

Run the e2e smoke suite (#126) after the first deploy and after any binding/secret change.

## Observability

`logpush: true` and `observability.enabled: true` in `wrangler.jsonc`. Logs land in the `rafters-logs` R2 bucket (already bound). Tail live with:

```bash
pnpm exec wrangler tail
```

## Cron triggers

`wrangler.jsonc` declares two crons:

- `0 * * * *` -> `runOrphanSweep` (uncertainty)
- `0 2 * * *` -> `runCalibrationRoll` (uncertainty)

The dispatch in `src/index.ts` is asserted to match the wrangler list by `tests/api/index.test.ts` -- adding a cron in `wrangler.jsonc` without a handler in `src/index.ts` (or vice versa) fails CI.
