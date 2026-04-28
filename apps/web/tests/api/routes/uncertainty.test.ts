import { describe, expect, it } from "vitest";
import {
  brierScore,
  bucketBounds,
  bucketIndex,
  bucketLower,
  cohortKey,
} from "../../../src/api/lib/uncertainty/cohort";
import {
  insertUncertaintyPredictionSchema,
  outcomeLabelSchema,
  predictionStateSchema,
} from "../../../src/db/schema/uncertainty.zod";

describe("bucketLower", () => {
  it("floors confidence to 0.1 buckets", () => {
    expect(bucketLower(0.0)).toBe(0);
    expect(bucketLower(0.34)).toBeCloseTo(0.3, 5);
    expect(bucketLower(0.5)).toBeCloseTo(0.5, 5);
    expect(bucketLower(0.99)).toBeCloseTo(0.9, 5);
  });

  it("clamps a perfect-confidence call into the top bucket", () => {
    expect(bucketLower(1)).toBe(0.9);
  });

  it("clamps negative confidence to the bottom bucket", () => {
    expect(bucketLower(-0.2)).toBe(0);
  });
});

describe("cohortKey", () => {
  it("composes surface, model, version, and bucket lower bound", () => {
    expect(cohortKey("rafters.color", "claude-sonnet-4-7", "2026-04-01", 0.82)).toBe(
      "rafters.color|claude-sonnet-4-7|2026-04-01|0.8",
    );
  });

  it("collapses confidences in the same bucket to the same cohort", () => {
    const a = cohortKey("eavesdrop.classify", "kimi-k2", "v1", 0.71);
    const b = cohortKey("eavesdrop.classify", "kimi-k2", "v1", 0.79);
    expect(a).toBe(b);
  });

  it("separates different surfaces into different cohorts", () => {
    const a = cohortKey("rafters.color", "m", "v", 0.5);
    const b = cohortKey("mail.deliverability", "m", "v", 0.5);
    expect(a).not.toBe(b);
  });
});

describe("bucketIndex + bucketBounds", () => {
  it("indexes 0..9 across [0, 1)", () => {
    expect(bucketIndex(0)).toBe(0);
    expect(bucketIndex(0.5)).toBe(5);
    expect(bucketIndex(0.99)).toBe(9);
  });

  it("clamps perfect confidence into the top bucket", () => {
    expect(bucketIndex(1)).toBe(9);
  });

  it("returns matching [lower, upper) bounds", () => {
    expect(bucketBounds(0)).toEqual({ lower: 0, upper: 0.1 });
    const seventh = bucketBounds(7);
    expect(seventh.lower).toBeCloseTo(0.7, 5);
    expect(seventh.upper).toBeCloseTo(0.8, 5);
  });
});

describe("brierScore", () => {
  it("returns 0 for an empty cohort", () => {
    expect(brierScore([], [])).toBe(0);
  });

  it("scores a perfectly calibrated cohort at 0", () => {
    expect(brierScore([1, 0, 1], [1, 0, 1])).toBe(0);
  });

  it("scores a worst-case cohort at 1", () => {
    expect(brierScore([1, 0], [0, 1])).toBe(1);
  });

  it("computes mean squared error", () => {
    // claimed = 0.8, actual = 0.5 -> diff^2 = 0.09 (single-row mean)
    expect(brierScore([0.8], [0.5])).toBeCloseTo(0.09, 5);
  });
});

describe("insertUncertaintyPredictionSchema", () => {
  it("accepts a well-formed emit", () => {
    const result = insertUncertaintyPredictionSchema.safeParse({
      surface: "rafters.color",
      featureKey: "oklch.lowChromaHighLightness",
      inputFingerprint: "abc123",
      model: "claude-sonnet-4-7",
      modelVersion: "2026-04-01",
      claimedConfidence: 0.82,
      predictionPayload: { name: "parchment" },
      state: "emitted",
      orphanAfter: new Date(),
      cohortKey: "rafters.color|claude-sonnet-4-7|2026-04-01|0.8",
    });
    expect(result.success).toBe(true);
  });

  it("rejects out-of-range confidence", () => {
    const result = insertUncertaintyPredictionSchema.safeParse({
      surface: "rafters.color",
      featureKey: "x",
      inputFingerprint: "y",
      model: "m",
      modelVersion: "v",
      claimedConfidence: 1.5,
      predictionPayload: {},
      state: "emitted",
      orphanAfter: new Date(),
      cohortKey: "k",
    });
    expect(result.success).toBe(false);
  });
});

describe("predictionStateSchema", () => {
  it("accepts the four lifecycle states", () => {
    for (const s of ["emitted", "witnessed", "orphaned", "retired"] as const) {
      expect(predictionStateSchema.safeParse(s).success).toBe(true);
    }
  });

  it("rejects an unknown state", () => {
    expect(predictionStateSchema.safeParse("calibrated").success).toBe(false);
  });
});

describe("outcomeLabelSchema", () => {
  it("accepts the per-surface outcome labels", () => {
    for (const l of ["accepted", "rejected", "edited", "ignored", "custom"] as const) {
      expect(outcomeLabelSchema.safeParse(l).success).toBe(true);
    }
  });
});
