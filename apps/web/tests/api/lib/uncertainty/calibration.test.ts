import { describe, expect, it } from "vitest";
import { bucketCohort, type CohortRow } from "../../../../src/api/lib/uncertainty/calibration";

const COHORT = "rafters.color|claude-sonnet-4-7|2026-04-01|0.8";

function row(partial: Partial<CohortRow>): CohortRow {
  return {
    cohortKey: COHORT,
    claimedConfidence: 0.85,
    outcomeCorrectness: 1,
    state: "witnessed",
    ...partial,
  };
}

describe("bucketCohort", () => {
  it("returns no buckets for an empty cohort", () => {
    expect(bucketCohort([])).toEqual([]);
  });

  it("drops buckets with zero witnessed predictions", () => {
    // Single witnessed prediction at 0.85 -> bucket 8 only
    const out = bucketCohort([row({ claimedConfidence: 0.85, outcomeCorrectness: 1 })]);
    expect(out).toHaveLength(1);
    expect(out[0].bucketLower).toBeCloseTo(0.8, 5);
    expect(out[0].bucketUpper).toBeCloseTo(0.9, 5);
  });

  it("means claimed and correctness within a bucket", () => {
    const out = bucketCohort([
      row({ claimedConfidence: 0.82, outcomeCorrectness: 1 }),
      row({ claimedConfidence: 0.88, outcomeCorrectness: 0.5 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].claimedConfidence).toBeCloseTo(0.85, 5);
    expect(out[0].actualCorrectness).toBeCloseTo(0.75, 5);
    expect(out[0].predictionCount).toBe(2);
  });

  it("computes Brier as mean squared error within the bucket", () => {
    const out = bucketCohort([
      row({ claimedConfidence: 0.8, outcomeCorrectness: 1 }), // (0.8-1)^2 = 0.04
      row({ claimedConfidence: 0.85, outcomeCorrectness: 0 }), // (0.85-0)^2 = 0.7225
    ]);
    expect(out[0].brierScore).toBeCloseTo((0.04 + 0.7225) / 2, 5);
  });

  it("ignores witnessed rows with null correctness", () => {
    const out = bucketCohort([
      row({ claimedConfidence: 0.85, outcomeCorrectness: null, state: "witnessed" }),
      row({ claimedConfidence: 0.85, outcomeCorrectness: 1 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].predictionCount).toBe(1);
  });

  it("ignores emitted-but-not-witnessed rows but does not double-count", () => {
    const out = bucketCohort([
      row({ claimedConfidence: 0.85, outcomeCorrectness: null, state: "emitted" }),
      row({ claimedConfidence: 0.85, outcomeCorrectness: 1 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].predictionCount).toBe(1);
  });

  it("attaches per-cohort orphan_count to every emitted bucket row", () => {
    const out = bucketCohort([
      row({ claimedConfidence: 0.25, outcomeCorrectness: 1 }),
      row({ claimedConfidence: 0.85, outcomeCorrectness: 0.5 }),
      row({ claimedConfidence: 0.85, outcomeCorrectness: null, state: "orphaned" }),
      row({ claimedConfidence: 0.85, outcomeCorrectness: null, state: "orphaned" }),
    ]);
    expect(out).toHaveLength(2);
    for (const snapshot of out) {
      expect(snapshot.orphanCount).toBe(2);
    }
  });

  it("places confidence=1.0 in the top bucket", () => {
    const out = bucketCohort([row({ claimedConfidence: 1, outcomeCorrectness: 1 })]);
    expect(out).toHaveLength(1);
    expect(out[0].bucketLower).toBeCloseTo(0.9, 5);
  });

  it("returns buckets sorted by lower bound", () => {
    const out = bucketCohort([
      row({ claimedConfidence: 0.95, outcomeCorrectness: 1 }),
      row({ claimedConfidence: 0.15, outcomeCorrectness: 0 }),
      row({ claimedConfidence: 0.55, outcomeCorrectness: 0.5 }),
    ]);
    expect(out.map((s) => s.bucketLower)).toEqual([
      expect.closeTo(0.1, 5),
      expect.closeTo(0.5, 5),
      expect.closeTo(0.9, 5),
    ]);
  });
});
