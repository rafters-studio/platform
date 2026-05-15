import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityFlags: ["nodejs_compat"],
      },
      wrangler: { configPath: "./apps/web/wrangler.test.jsonc" },
    }),
  ],
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "dist", ".wrangler"],
    globals: true,
    passWithNoTests: true,
  },
});
