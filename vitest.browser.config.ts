import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["**/*.spec.ts", "**/*.spec.tsx"],
		exclude: ["node_modules", "dist", ".wrangler"],
		globals: true,
		browser: {
			enabled: true,
			provider: "playwright",
			instances: [{ browser: "chromium" }],
		},
	},
});
