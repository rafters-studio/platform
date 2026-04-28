import { eq, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Database } from "../../../db/client";
import {
  uncertaintyCalibrationSnapshot,
  uncertaintyPrediction,
} from "../../../db/schema/uncertainty";
import { BUCKET_COUNT, bucketBounds, bucketIndex, brierScore } from "./cohort";

export type CohortRow = {
  cohortKey: string;
  claimedConfidence: number;
  outcomeCorrectness: number | null;
  state: "emitted" | "witnessed" | "orphaned" | "retired";
};

export type BucketSnapshot = {
  cohortKey: string;
  bucketLower: number;
  bucketUpper: number;
  claimedConfidence: number;
  actualCorrectness: number;
  predictionCount: number;
  orphanCount: number;
  brierScore: number;
};

/**
 * Splits witnessed predictions in a cohort into 10 buckets of 0.1 width on
 * claimed_confidence. Per bucket: mean claimed, mean correctness, count, and
 * Brier score. Orphan count is per-cohort (not per-bucket) and attached to
 * every emitted snapshot row so the dashboard can show the orphan share.
 *
 * Buckets with zero witnessed predictions are dropped -- a bucket only exists
 * once at least one prediction has fully resolved.
 */
export function bucketCohort(rows: readonly CohortRow[]): BucketSnapshot[] {
  if (rows.length === 0) return [];
  const cohortKey = rows[0].cohortKey;

  const witnessed = rows.filter(
    (r): r is CohortRow & { outcomeCorrectness: number } =>
      r.state === "witnessed" && r.outcomeCorrectness !== null,
  );
  const orphanCount = rows.filter((r) => r.state === "orphaned").length;

  const buckets: { claimed: number[]; correctness: number[] }[] = Array.from(
    { length: BUCKET_COUNT },
    () => ({ claimed: [], correctness: [] }),
  );

  for (const row of witnessed) {
    const idx = bucketIndex(row.claimedConfidence);
    buckets[idx].claimed.push(row.claimedConfidence);
    buckets[idx].correctness.push(row.outcomeCorrectness);
  }

  const out: BucketSnapshot[] = [];
  for (let i = 0; i < BUCKET_COUNT; i++) {
    const b = buckets[i];
    if (b.claimed.length === 0) continue;
    const { lower, upper } = bucketBounds(i);
    const meanClaimed = b.claimed.reduce((a, c) => a + c, 0) / b.claimed.length;
    const meanCorrectness = b.correctness.reduce((a, c) => a + c, 0) / b.correctness.length;
    out.push({
      cohortKey,
      bucketLower: lower,
      bucketUpper: upper,
      claimedConfidence: meanClaimed,
      actualCorrectness: meanCorrectness,
      predictionCount: b.claimed.length,
      orphanCount,
      brierScore: brierScore(b.claimed, b.correctness),
    });
  }
  return out;
}

/**
 * Recompute snapshots for every active cohort. "Active" means the cohort has
 * at least one resolved (witnessed or orphaned) prediction.
 */
export async function rollCalibration(
  db: Database,
  now: Date = new Date(),
): Promise<{ cohorts: number; rows: number }> {
  const cohortKeys = await db
    .select({ cohortKey: uncertaintyPrediction.cohortKey })
    .from(uncertaintyPrediction)
    .where(sql`${uncertaintyPrediction.state} IN ('witnessed', 'orphaned')`)
    .groupBy(uncertaintyPrediction.cohortKey);

  let totalRows = 0;
  for (const { cohortKey } of cohortKeys) {
    const rows = (await db
      .select({
        cohortKey: uncertaintyPrediction.cohortKey,
        claimedConfidence: uncertaintyPrediction.claimedConfidence,
        outcomeCorrectness: uncertaintyPrediction.outcomeCorrectness,
        state: uncertaintyPrediction.state,
      })
      .from(uncertaintyPrediction)
      .where(eq(uncertaintyPrediction.cohortKey, cohortKey))) as CohortRow[];

    const snapshots = bucketCohort(rows);

    await db
      .delete(uncertaintyCalibrationSnapshot)
      .where(eq(uncertaintyCalibrationSnapshot.cohortKey, cohortKey));

    if (snapshots.length > 0) {
      await db.insert(uncertaintyCalibrationSnapshot).values(
        snapshots.map((s) => ({
          id: uuidv7(),
          ...s,
          computedAt: now,
        })),
      );
      totalRows += snapshots.length;
    }
  }

  return { cohorts: cohortKeys.length, rows: totalRows };
}
