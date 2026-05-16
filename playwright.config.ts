import { defineConfig, devices } from "@playwright/test";

// Smoke suite runs against a real deployed worker. Default targets production;
// override via SMOKE_BASE_URL=https://staging.example.com pnpm test:e2e for staging.
// No webServer -- this suite never spins up local dev.
const baseURL = process.env.SMOKE_BASE_URL ?? "https://rafters.studio";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "smoke",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
