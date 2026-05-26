import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const validEmit = {
  surface: "rafters.color",
  feature_key: "oklch.lowChromaHighLightness",
  input_fingerprint: "abc123",
  model: "claude-sonnet-4-6",
  model_version: "2026-04-01",
  claimed_confidence: 0.82,
  prediction_payload: { name: "parchment" },
};

describe("POST /api/uncertainty/predictions auth", () => {
  it("returns 401 when no Authorization or x-api-key header", async () => {
    const res = await SELF.fetch("http://localhost/api/uncertainty/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validEmit),
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 when Authorization header lacks Bearer prefix", async () => {
    const res = await SELF.fetch("http://localhost/api/uncertainty/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Token abc" },
      body: JSON.stringify(validEmit),
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 when api-key does not match any row", async () => {
    const res = await SELF.fetch("http://localhost/api/uncertainty/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer rk_definitely_not_a_real_key_value_zzzzzzzzzzzzzzzzz",
      },
      body: JSON.stringify(validEmit),
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/uncertainty/calibration auth", () => {
  it("returns 401 when no auth", async () => {
    const res = await SELF.fetch(
      "http://localhost/api/uncertainty/calibration?surface=rafters.color&model=claude-sonnet-4-6",
    );
    expect(res.status).toBe(401);
  });
});

describe("GET /api/uncertainty/orphans auth", () => {
  it("returns 401 when no auth", async () => {
    const res = await SELF.fetch("http://localhost/api/uncertainty/orphans");
    expect(res.status).toBe(401);
  });
});
