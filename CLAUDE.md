# ezmode.games Platform

## Stack

- **Runtime**: Cloudflare Workers
- **API**: Hono + `@hono/zod-openapi` + `stoker`
- **API Docs**: Scalar (`@scalar/hono-api-reference`)
- **Auth**: better-auth (native D1, OAuth2 for v2, API key for v1)
- **Database**: Cloudflare D1, Drizzle as query builder only
- **Schemas**: Zod is source of truth. `drizzle-zod` bridges DB to API schemas.
- **Audit/Soft-delete/GDPR**: `@ezmode-games/drizzle-ledger`
- **Client**: `openapi-typescript` + `openapi-fetch` + `openapi-react-query`
- **State**: TanStack Query (cache/fetch), TanStack Forms (validation/submission)
- **UI**: Rafters for all surfaces, with ezmode-specific composite library
- **Lint/Format**: OXC (oxlint + oxc-format)
- **TypeScript**: v6 (Go parser)
- **Package Manager**: pnpm (never npm/yarn)
- **IDs**: UUIDv7 for all identifiers

## API Versioning

Two API versions served from the same Hono app:

- **v1**: Nexus-compatible endpoints. API key auth. Exists so MO2 and Wabbajack work without changes -- users swap the base URL and API key, existing mod managers just work. Thin translation layer over shared business logic.
- **v2**: Our real API, internal and external. OAuth2 auth. OpenAPI spec published for third-party developers. Internal-only endpoints are unpublished and require session + additional headers.

Both versions have their own OpenAPI spec and Scalar docs page.

## Migrations

**CRITICAL: Wrangler owns all D1 migrations. Drizzle is a query builder only.**

The only workflow for schema changes:

1. `wrangler d1 migrations create <migration-name>` -- creates the file
2. Write SQL into the generated file
3. `wrangler d1 migrations apply` -- applies it

NEVER:

- Manually create, edit, or delete files in the migrations folder
- Touch migration metadata or journal files
- Use `drizzle-kit push` or `drizzle-kit migrate` against D1
- Use `mkdir`, `touch`, or `Write` to create migration files

Drizzle schema files exist for type inference and query building. Wrangler handles all migration state. Breaking this rule corrupts wrangler's migration tracking.

---

# Testing

## Philosophy

Tests are tools, not theater. Every test file has one job based on its extension. No crossing lines.

## Test Location

All tests live in `tests/` mirroring the source tree:

```
src/
  routes/
    mods/
      mods.handlers.ts
      mods.routes.ts
  components/
    mod-card/
      mod-card.tsx

tests/
  routes/
    mods/
      mods.handlers.test.ts      # unit
      mods.routes.test.ts         # unit
  components/
    mod-card/
      mod-card.spec.ts            # component behavior
  flows/
    publish-mod.e2e.ts            # end-to-end
```

Tests are NEVER colocated with source files. The `tests/` folder is the single location.

## Three Extensions, Three Runners, Three Jobs

### `.test.ts` -- Unit Tests (Vitest)

**Runner**: Plain Vitest, no special pool or browser.
**Config**: `vitest.config.ts`
**Data**: Zocker generates typed mock data from Zod schemas.

**What belongs here**:

- Pure function logic (validation, transformation, calculation)
- Schema correctness (does this Zod schema accept/reject what it should?)
- Handler logic with mocked dependencies
- Utility functions
- Error path coverage

**What does NOT belong here**:

- DOM rendering, clicks, visual assertions (that is a `.spec.ts`)
- Real D1/R2/KV calls (mock with Zocker or test in `.e2e.ts`)
- HTTP request/response cycles through the full Hono app (that is a `.spec.ts` or `.e2e.ts`)
- Anything that needs `document`, `window`, or a browser environment

**Rules**:

- Every test gets its data from Zocker or explicit inline fixtures. No shared mutable state.
- No network calls. No filesystem. No D1. If your unit test needs infrastructure, it is not a unit test.
- Test one behavior per `it()` block. Name it as a sentence: "returns 422 when email is missing."

### `.spec.ts` -- Component Behavior Tests (Vitest Browser Mode)

**Runner**: Vitest with `@vitest/browser-playwright` provider. Real Chromium.
**Config**: `vitest.browser.config.ts`
**Data**: Zocker for props and mock API responses.

**What belongs here**:

- Component renders with correct props
- User interactions (click, type, submit) produce correct state changes
- Conditional rendering based on data states (loading, error, empty, populated)
- Form validation feedback visible to the user
- Accessibility assertions (role, label, aria attributes)
- Component composition (parent passes data, child renders it)

**What does NOT belong here**:

- API logic, route handling, business rules (that is a `.test.ts`)
- Multi-page flows, navigation, auth redirects (that is an `.e2e.ts`)
- Visual regression / screenshot comparison (use Storybook or `.e2e.ts`)
- Testing third-party library internals

**Rules**:

- Mount one component (or a small composition) per test file.
- Interact like a user: query by role and label, not by CSS selector or test ID.
- Never assert on implementation details (state variables, internal methods, hook return values).
- Zocker generates realistic props. Do not hand-write 50-field objects.

### `.e2e.ts` -- End-to-End Tests (Playwright)

**Runner**: `@playwright/test` with full browser automation.
**Config**: `playwright.config.ts`
**Data**: Real services, seeded database, actual auth flows.

**What belongs here**:

- Complete user journeys (sign up, upload mod, get paid)
- Auth flows (OAuth2 login, API key validation, session expiry)
- Cross-page navigation and deep linking
- Real API calls through the full Workers stack
- Visual regression on critical pages
- Smoke tests for production deployments

**What does NOT belong here**:

- Testing individual functions or components (that is a `.test.ts` or `.spec.ts`)
- Mocked data scenarios (use real or seeded data)
- Exhaustive edge case coverage (too slow, cover those in `.test.ts`)

**Rules**:

- E2E tests are slow and expensive. Cover happy paths and critical failure modes only.
- Seed the database with known state before each test suite.
- Never depend on test execution order.
- Use `page.getByRole()` and `page.getByLabel()` over selectors.

## The Decision Tree

Before writing a test, ask:

1. **Does it need a browser?**
   - No -> `.test.ts`
   - Yes -> continue
2. **Does it test a component in isolation?**
   - Yes -> `.spec.ts`
   - No -> continue
3. **Does it test a multi-page flow or real infrastructure?**
   - Yes -> `.e2e.ts`

If you are unsure, it is a `.test.ts`. Unit tests are the default. You need a reason to escalate to `.spec.ts` or `.e2e.ts`.

## Common Anti-Patterns

| Anti-pattern                                     | Why it is wrong                      | What to do instead                                   |
| ------------------------------------------------ | ------------------------------------ | ---------------------------------------------------- |
| Unit test imports a component and renders it     | That is a spec, not a unit test      | Move to `.spec.ts`, use browser runner               |
| Unit test creates a real D1 database             | That is integration testing          | Mock with Zocker, or move to `.e2e.ts`               |
| Spec test calls `fetch()` to hit a real API      | That is an E2E test                  | Mock the API response in the spec                    |
| E2E test covers 40 edge cases for one form field | Too slow, too fragile                | Cover edge cases in `.test.ts` with Zod schema tests |
| Spec test asserts `useState` was called          | Testing implementation, not behavior | Assert on what the user sees                         |
| Test file has no extension convention            | Nobody knows what runner to use      | Pick the right extension from the decision tree      |
| Shared mutable test fixtures across files        | Order-dependent failures             | Zocker generates fresh data per test                 |

## Running Tests

```bash
pnpm test              # unit tests (.test.ts)
pnpm test:spec         # component behavior tests (.spec.ts)
pnpm test:e2e          # end-to-end tests (.e2e.ts)
pnpm test:all          # everything
```

---

# Code Conventions

- No emoji in code, comments, or commits
- No `any` -- use `unknown` and narrow
- UUIDv7 for all identifiers
- Zod validates at system boundaries (user input, external APIs). Trust internal code.
- No arbitrary Tailwind values (`-[400px]`). Use design tokens.
- No CSS positioning (`absolute`, `relative`, `fixed`) unless no alternative. Use flexbox/grid.
- Prefer container queries (`@container`, `@md:`) over media queries for component-level responsiveness.
