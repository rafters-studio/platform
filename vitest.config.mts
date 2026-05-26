import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrationsPath = path.join(__dirname, "apps/web/src/db/migrations");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    plugins: [
      cloudflareTest({
        miniflare: {
          compatibilityFlags: ["nodejs_compat"],
          bindings: { TEST_MIGRATIONS: migrations },
        },
        wrangler: { configPath: "./apps/web/wrangler.test.jsonc" },
      }),
    ],
    test: {
      include: ["tests/**/*.test.ts"],
      exclude: ["**/node_modules/**", "dist", ".wrangler"],
      globals: true,
      passWithNoTests: true,
      setupFiles: ["./tests/setup.ts"],
    },
  };
});
