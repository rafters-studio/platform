import { describe, expect, it } from "vite-plus/test";
import app from "../src/index";

// Runs under plain Vitest via app.request(), not in workerd. See .cf-future.
describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
