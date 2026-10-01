import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  staged: {
    "*.{js,ts,tsx,json,md,yml,yaml}": "vp check --fix",
  },
  test: {
    include: ["apps/*/src/**/*.test.ts"],
  },
});
