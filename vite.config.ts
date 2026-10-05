import { defineConfig } from "vite-plus";

export default defineConfig({
  // Markdown imported by the worker is plain text, matching wrangler's Text rule.
  plugins: [
    {
      name: "markdown-as-text",
      transform(code: string, id: string) {
        if (id.endsWith(".md"))
          return { code: `export default ${JSON.stringify(code)};`, map: null };
      },
    },
  ],
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
