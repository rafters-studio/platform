import { describe, expect, it } from "vitest";
import { cronHandlers } from "../../apps/web/src/index";
import wranglerJsoncRaw from "../../apps/web/wrangler.jsonc?raw";

function declaredCrons(): string[] {
  const stripped = wranglerJsoncRaw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/,(\s*[}\]])/g, "$1");
  const config = JSON.parse(stripped) as { triggers?: { crons?: string[] } };
  return config.triggers?.crons ?? [];
}

describe("scheduled cron dispatch", () => {
  it("registers a handler for every cron pattern declared in wrangler.jsonc, and vice versa", () => {
    const declared = declaredCrons();
    const registered = Object.keys(cronHandlers);

    for (const cron of declared) {
      expect(
        registered,
        `cron "${cron}" is declared in wrangler.jsonc but no handler is registered in src/index.ts`,
      ).toContain(cron);
    }
    for (const cron of registered) {
      expect(
        declared,
        `cron "${cron}" has a handler in src/index.ts but is not declared in wrangler.jsonc`,
      ).toContain(cron);
    }
  });

  it("each handler has a stable name", () => {
    for (const handler of Object.values(cronHandlers)) {
      expect(handler.name).toMatch(/^[a-z][a-z0-9-]+$/);
    }
  });
});
