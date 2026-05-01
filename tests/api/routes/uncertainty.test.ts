import { describe, expect, it } from "vitest";
import { emitSchema, witnessSchema } from "../../../apps/web/src/api/routes/uncertainty";

describe("emitSchema", () => {
  const valid = {
    surface: "rafters.color",
    feature_key: "oklch.lowChromaHighLightness",
    input_fingerprint: "abc123",
    model: "claude-sonnet-4-6",
    model_version: "2026-04-01",
    claimed_confidence: 0.82,
    prediction_payload: { name: "parchment" },
  };

  it("accepts valid emit payload", () => {
    expect(emitSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults orphan_ttl_days to 30", () => {
    const result = emitSchema.safeParse(valid);
    expect(result.success && result.data.orphan_ttl_days).toBe(30);
  });

  it("rejects claimed_confidence above 1", () => {
    expect(emitSchema.safeParse({ ...valid, claimed_confidence: 1.1 }).success).toBe(false);
  });

  it("rejects claimed_confidence below 0", () => {
    expect(emitSchema.safeParse({ ...valid, claimed_confidence: -0.1 }).success).toBe(false);
  });

  it("rejects empty surface", () => {
    expect(emitSchema.safeParse({ ...valid, surface: "" }).success).toBe(false);
  });

  it("rejects missing model", () => {
    const { model: _model, ...rest } = valid;
    expect(emitSchema.safeParse(rest).success).toBe(false);
  });
});

describe("witnessSchema", () => {
  const valid = {
    outcome_label: "accepted" as const,
    outcome_correctness: 1.0,
  };

  it("accepts valid witness payload", () => {
    expect(witnessSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects unknown outcome_label", () => {
    expect(witnessSchema.safeParse({ ...valid, outcome_label: "skipped" }).success).toBe(false);
  });

  it("rejects outcome_correctness above 1", () => {
    expect(witnessSchema.safeParse({ ...valid, outcome_correctness: 1.1 }).success).toBe(false);
  });

  it("accepts optional outcome_payload", () => {
    const result = witnessSchema.safeParse({ ...valid, outcome_payload: { final_name: "bone" } });
    expect(result.success).toBe(true);
  });

  it("accepts all valid outcome labels", () => {
    const labels = ["accepted", "rejected", "edited", "ignored", "custom"] as const;
    for (const label of labels) {
      expect(witnessSchema.safeParse({ ...valid, outcome_label: label }).success).toBe(true);
    }
  });
});
