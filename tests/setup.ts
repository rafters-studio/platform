import { applyD1Migrations, env } from "cloudflare:test";

// Setup runs once per worker isolate. applyD1Migrations is idempotent;
// only migrations not yet applied are run.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
