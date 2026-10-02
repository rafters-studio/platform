import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: ["apps/*/worker-configuration.d.ts"],
  },
  lint: {
    ignorePatterns: ["apps/*/worker-configuration.d.ts"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  staged: {
    "*.{js,ts,tsx,json,md,yml,yaml}": "vp check --fix",
  },
  test: {
    include: ["apps/*/test/**/*.test.ts"],
  },
});
