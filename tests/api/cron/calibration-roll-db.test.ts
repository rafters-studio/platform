import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { runCalibrationRoll } from "../../../apps/web/src/cron/calibration-roll";

const COHORT = "test.surface::test-model::v1";

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM uncertainty_prediction").run();
  await env.DB.prepare("DELETE FROM uncertainty_calibration_snapshot").run();
});

async function insertWitnessed(opts: {
  id: string;
  claimedConfidence: number;
  outcomeCorrectness: number;
}) {
  await env.DB.prepare(
    `INSERT INTO uncertainty_prediction (
      id, surface, feature_key, input_fingerprint, model, model_version,
      claimed_confidence, prediction_payload, state, outcome_label,
      outcome_correctness, created_at, witnessed_at, orphan_after, cohort_key
    ) VALUES (?, 'test.surface', 'fk', 'fp', 'test-model', 'v1', ?, '{}',
      'witnessed', 'accepted', ?, ?, ?, ?, ?)`,
  )
    .bind(
      opts.id,
      opts.claimedConfidence,
      opts.outcomeCorrectness,
      Date.now(),
      Date.now(),
      Date.now() + 86_400_000,
      COHORT,
    )
    .run();
}

async function insertOrphaned(id: string, claimedConfidence: number) {
  await env.DB.prepare(
    `INSERT INTO uncertainty_prediction (
      id, surface, feature_key, input_fingerprint, model, model_version,
      claimed_confidence, prediction_payload, state, created_at,
      orphan_after, cohort_key
    ) VALUES (?, 'test.surface', 'fk', 'fp', 'test-model', 'v1', ?, '{}',
      'orphaned', ?, ?, ?)`,
  )
    .bind(id, claimedConfidence, Date.now() - 86_400_000, Date.now() - 1000, COHORT)
    .run();
}

describe("runCalibrationRoll", () => {
  it("excludes orphans from the Brier calculation -- the load-bearing design invariant", async () => {
    // Two witnessed predictions, both perfectly calibrated in the [0.7, 0.8) bucket
    await insertWitnessed({
      id: "01970000-0000-0000-0000-000000000010",
      claimedConfidence: 0.75,
      outcomeCorrectness: 0.75,
    });
    await insertWitnessed({
      id: "01970000-0000-0000-0000-000000000011",
      claimedConfidence: 0.78,
      outcomeCorrectness: 0.78,
    });
    // An orphan in the SAME bucket -- if it leaked into Brier it would skew the score.
    await insertOrphaned("01970000-0000-0000-0000-000000000012", 0.72);

    await runCalibrationRoll(env.DB);

    const snapshot = await env.DB.prepare(
      "SELECT brier_score, prediction_count, orphan_count FROM uncertainty_calibration_snapshot WHERE cohort_key = ?",
    )
      .bind(COHORT)
      .first<{ brier_score: number; prediction_count: number; orphan_count: number }>();

    expect(snapshot).toBeTruthy();
    // Perfect calibration -> Brier == 0. If the orphan leaked in as correctness=0, Brier would
    // jump to ~0.18 (one outlier of (0.72-0)^2 averaged across 3).
    expect(snapshot?.brier_score).toBe(0);
    // Only the two witnessed rows feed prediction_count
    expect(snapshot?.prediction_count).toBe(2);
    // The orphan is counted separately per the design doc
    expect(snapshot?.orphan_count).toBe(1);
  });

  it("writes one snapshot row per occupied bucket", async () => {
    // Two predictions in two distinct buckets
    await insertWitnessed({
      id: "01970000-0000-0000-0000-000000000020",
      claimedConfidence: 0.15,
      outcomeCorrectness: 1.0,
    });
    await insertWitnessed({
      id: "01970000-0000-0000-0000-000000000021",
      claimedConfidence: 0.85,
      outcomeCorrectness: 0.0,
    });

    await runCalibrationRoll(env.DB);

    const rows = await env.DB.prepare(
      "SELECT bucket_lower FROM uncertainty_calibration_snapshot WHERE cohort_key = ? ORDER BY bucket_lower",
    )
      .bind(COHORT)
      .all<{ bucket_lower: number }>();
    expect(rows.results).toHaveLength(2);
    expect(rows.results[0].bucket_lower).toBeCloseTo(0.1);
    expect(rows.results[1].bucket_lower).toBeCloseTo(0.8);
  });

  it("replaces existing snapshots on re-run (delete + insert pattern)", async () => {
    await insertWitnessed({
      id: "01970000-0000-0000-0000-000000000030",
      claimedConfidence: 0.5,
      outcomeCorrectness: 0.5,
    });

    await runCalibrationRoll(env.DB);
    await runCalibrationRoll(env.DB);

    const count = await env.DB.prepare(
      "SELECT COUNT(*) as c FROM uncertainty_calibration_snapshot WHERE cohort_key = ?",
    )
      .bind(COHORT)
      .first<{ c: number }>();
    expect(count?.c).toBe(1);
  });

  it("writes no snapshot rows when only orphans exist (cohort has no witnessed predictions)", async () => {
    await insertOrphaned("01970000-0000-0000-0000-000000000040", 0.5);

    await runCalibrationRoll(env.DB);

    const count = await env.DB.prepare(
      "SELECT COUNT(*) as c FROM uncertainty_calibration_snapshot WHERE cohort_key = ?",
    )
      .bind(COHORT)
      .first<{ c: number }>();
    expect(count?.c).toBe(0);
  });
});
