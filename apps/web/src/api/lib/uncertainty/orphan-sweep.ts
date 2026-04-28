import { and, eq, lt } from "drizzle-orm";
import type { Database } from "../../../db/client";
import { uncertaintyPrediction } from "../../../db/schema/uncertainty";

export type SweepResult = {
  swept: number;
  cutoffMs: number;
};

export async function sweepOrphans(db: Database, now: Date = new Date()): Promise<SweepResult> {
  const cutoff = now;
  const result = await db
    .update(uncertaintyPrediction)
    .set({ state: "orphaned" })
    .where(
      and(
        eq(uncertaintyPrediction.state, "emitted"),
        lt(uncertaintyPrediction.orphanAfter, cutoff),
      ),
    )
    .returning({ id: uncertaintyPrediction.id });

  return { swept: result.length, cutoffMs: cutoff.getTime() };
}
