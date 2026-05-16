import { and, eq, lt } from "drizzle-orm";
import { createDb } from "../db/client";
import { uncertaintyPrediction } from "../db/schema/uncertainty";

export async function runOrphanSweep(d1: D1Database): Promise<number> {
  const db = createDb(d1);
  const now = new Date();

  const result = await db
    .update(uncertaintyPrediction)
    .set({ state: "orphaned" })
    .where(
      and(eq(uncertaintyPrediction.state, "emitted"), lt(uncertaintyPrediction.orphanAfter, now)),
    )
    .returning({ id: uncertaintyPrediction.id });

  return result.length;
}
