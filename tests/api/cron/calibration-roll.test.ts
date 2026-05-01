import { describe, expect, it } from "vitest";
import { computeBuckets } from "../../../apps/web/src/api/cron/calibration-roll";

describe("computeBuckets", () => {
  it("returns empty array when no predictions", () => {
    expect(computeBuckets([])).toEqual([]);
  });

  it("places predictions in correct buckets", () => {
    const predictions = [
      { claimedConfidence: 0.75, outcomeCorrectness: 1.0 },
      { claimedConfidence: 0.78, outcomeCorrectness: 0.0 },
    ];
    const rows = computeBuckets(predictions);
    expect(rows).toHaveLength(1);
    expect(rows[0].bucketLower).toBe(0.7);
    expect(rows[0].bucketUpper).toBe(0.8);
    expect(rows[0].predictionCount).toBe(2);
  });

  it("computes correct Brier score for perfect predictions", () => {
    const predictions = [
      { claimedConfidence: 0.8, outcomeCorrectness: 0.8 },
      { claimedConfidence: 0.85, outcomeCorrectness: 0.85 },
    ];
    const rows = computeBuckets(predictions);
    expect(rows[0].brierScore).toBe(0);
  });

  it("computes correct Brier score for worst-case predictions", () => {
    const predictions = [{ claimedConfidence: 0.8, outcomeCorrectness: 0.0 }];
    const rows = computeBuckets(predictions);
    expect(rows[0].brierScore).toBeCloseTo(0.64);
  });

  it("splits predictions across multiple buckets", () => {
    const predictions = [
      { claimedConfidence: 0.15, outcomeCorrectness: 1.0 },
      { claimedConfidence: 0.85, outcomeCorrectness: 0.0 },
    ];
    const rows = computeBuckets(predictions);
    expect(rows).toHaveLength(2);
    expect(rows[0].bucketLower).toBe(0.1);
    expect(rows[1].bucketLower).toBe(0.8);
  });

  it("treats null outcomeCorrectness as 0", () => {
    const predictions = [{ claimedConfidence: 0.5, outcomeCorrectness: null }];
    const rows = computeBuckets(predictions);
    expect(rows[0].actualCorrectness).toBe(0);
    expect(rows[0].brierScore).toBeCloseTo(0.25);
  });

  it("excludes empty buckets from output", () => {
    const predictions = [{ claimedConfidence: 0.55, outcomeCorrectness: 0.5 }];
    const rows = computeBuckets(predictions);
    expect(rows).toHaveLength(1);
    expect(rows[0].bucketLower).toBe(0.5);
  });

  it("computes claimedConfidence mean per bucket", () => {
    const predictions = [
      { claimedConfidence: 0.71, outcomeCorrectness: 1.0 },
      { claimedConfidence: 0.79, outcomeCorrectness: 1.0 },
    ];
    const rows = computeBuckets(predictions);
    expect(rows[0].claimedConfidence).toBeCloseTo(0.75);
  });
});
