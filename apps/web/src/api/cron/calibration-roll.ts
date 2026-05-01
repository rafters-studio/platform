import { and, eq, sql } from "drizzle-orm";
import { createDb } from "../../db/client";
import { uncertaintyCalibrationSnapshot, uncertaintyPrediction } from "../../db/schema/uncertainty";

export const BUCKETS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] as const;

export type BucketRow = {
  bucketLower: number;
  bucketUpper: number;
  claimedConfidence: number;
  actualCorrectness: number;
  predictionCount: number;
  brierScore: number;
};

export function computeBuckets(
  predictions: { claimedConfidence: number; outcomeCorrectness: number | null }[],
): BucketRow[] {
  const rows: BucketRow[] = [];

  for (let i = 0; i < BUCKETS.length - 1; i++) {
    const lower = BUCKETS[i];
    const upper = BUCKETS[i + 1];

    const bucket = predictions.filter(
      (p) => p.claimedConfidence >= lower && p.claimedConfidence < upper,
    );

    if (bucket.length === 0) continue;

    const claimedMean = bucket.reduce((s, p) => s + p.claimedConfidence, 0) / bucket.length;
    const correctnessMean =
      bucket.reduce((s, p) => s + (p.outcomeCorrectness ?? 0), 0) / bucket.length;
    const brierScore =
      bucket.reduce((s, p) => s + (p.claimedConfidence - (p.outcomeCorrectness ?? 0)) ** 2, 0) /
      bucket.length;

    rows.push({
      bucketLower: lower,
      bucketUpper: upper,
      claimedConfidence: claimedMean,
      actualCorrectness: correctnessMean,
      predictionCount: bucket.length,
      brierScore,
    });
  }

  return rows;
}

export async function runCalibrationRoll(d1: D1Database): Promise<number> {
  const db = createDb(d1);

  const cohorts = await db
    .selectDistinct({ cohortKey: uncertaintyPrediction.cohortKey })
    .from(uncertaintyPrediction)
    .where(eq(uncertaintyPrediction.state, "witnessed"))
    .all();

  let snapshotCount = 0;

  for (const { cohortKey } of cohorts) {
    const witnessed = await db
      .select({
        claimedConfidence: uncertaintyPrediction.claimedConfidence,
        outcomeCorrectness: uncertaintyPrediction.outcomeCorrectness,
      })
      .from(uncertaintyPrediction)
      .where(
        and(
          eq(uncertaintyPrediction.cohortKey, cohortKey),
          eq(uncertaintyPrediction.state, "witnessed"),
        ),
      )
      .all();

    const orphanCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(uncertaintyPrediction)
      .where(
        and(
          eq(uncertaintyPrediction.cohortKey, cohortKey),
          eq(uncertaintyPrediction.state, "orphaned"),
        ),
      )
      .get();

    const totalOrphans = orphanCount?.count ?? 0;

    await db
      .delete(uncertaintyCalibrationSnapshot)
      .where(eq(uncertaintyCalibrationSnapshot.cohortKey, cohortKey));

    const buckets = computeBuckets(witnessed);
    const rows = buckets.map((b) => ({
      cohortKey,
      ...b,
      orphanCount: totalOrphans,
      computedAt: new Date(),
    }));

    if (rows.length > 0) {
      await db.insert(uncertaintyCalibrationSnapshot).values(rows);
      snapshotCount += rows.length;
    }
  }

  return snapshotCount;
}
