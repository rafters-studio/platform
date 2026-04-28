import { zValidator } from "@hono/zod-validator";
import { and, count, eq, like, sql } from "drizzle-orm";
import { Hono } from "hono";
import { uuidv7 } from "uuidv7";
import { z } from "zod";
import { createDb } from "../../db/client";
import { uncertaintyCalibrationSnapshot, uncertaintyPrediction } from "../../db/schema/uncertainty";
import { outcomeLabelSchema, surfaceSchema } from "../../db/schema/uncertainty.zod";
import { cohortKey, DAY_MS, DEFAULT_ORPHAN_TTL_DAYS } from "../lib/uncertainty/cohort";
import { sweepOrphans } from "../lib/uncertainty/orphan-sweep";
import { requireAuth } from "../middleware/auth";
import type { HonoEnv } from "../types";

function authorizeCron(c: {
  req: { header: (n: string) => string | undefined };
  env: Env;
}): boolean {
  const secret = c.env.CRON_SECRET;
  if (!secret) return false;
  const header = c.req.header("authorization");
  if (!header) return false;
  return header === `Bearer ${secret}`;
}

const emitBodySchema = z.object({
  surface: surfaceSchema,
  feature_key: z.string().min(1).max(128),
  input_fingerprint: z.string().min(1).max(128),
  model: z.string().min(1).max(64),
  model_version: z.string().min(1).max(64),
  claimed_confidence: z.number().min(0).max(1),
  prediction_payload: z.unknown(),
  orphan_ttl_days: z.number().int().min(1).max(365).optional(),
});

const witnessBodySchema = z.object({
  outcome_label: outcomeLabelSchema,
  outcome_correctness: z.number().min(0).max(1),
  outcome_payload: z.unknown().optional(),
});

const calibrationQuerySchema = z.object({
  surface: surfaceSchema,
  model: z.string().min(1).max(64),
  model_version: z.string().min(1).max(64),
});

const uncertaintyRoutes = new Hono<HonoEnv>()
  .use("*", requireAuth)
  .post("/predictions", zValidator("json", emitBodySchema), async (c) => {
    const body = c.req.valid("json");
    const db = createDb(c.env.DB);

    const id = uuidv7();
    const now = Date.now();
    const ttlDays = body.orphan_ttl_days ?? DEFAULT_ORPHAN_TTL_DAYS;
    const orphanAfter = now + ttlDays * DAY_MS;

    await db.insert(uncertaintyPrediction).values({
      id,
      surface: body.surface,
      featureKey: body.feature_key,
      inputFingerprint: body.input_fingerprint,
      model: body.model,
      modelVersion: body.model_version,
      claimedConfidence: body.claimed_confidence,
      predictionPayload: body.prediction_payload,
      state: "emitted",
      createdAt: new Date(now),
      orphanAfter: new Date(orphanAfter),
      cohortKey: cohortKey(body.surface, body.model, body.model_version, body.claimed_confidence),
    });

    return c.json({ id, orphan_after: orphanAfter }, 201);
  })
  .put(
    "/predictions/:id/witness",
    zValidator("param", z.object({ id: z.string().min(1) })),
    zValidator("json", witnessBodySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const db = createDb(c.env.DB);

      const existing = await db
        .select({ state: uncertaintyPrediction.state })
        .from(uncertaintyPrediction)
        .where(eq(uncertaintyPrediction.id, id))
        .limit(1);

      if (existing.length === 0) {
        return c.json({ error: "Prediction not found" }, 404);
      }

      if (existing[0].state === "witnessed") {
        return c.json({ error: "Prediction already witnessed" }, 409);
      }

      await db
        .update(uncertaintyPrediction)
        .set({
          state: "witnessed",
          outcomeLabel: body.outcome_label,
          outcomeCorrectness: body.outcome_correctness,
          outcomePayload: body.outcome_payload ?? null,
          witnessedAt: new Date(),
        })
        .where(and(eq(uncertaintyPrediction.id, id), eq(uncertaintyPrediction.state, "emitted")));

      return c.json({ id, state: "witnessed" as const });
    },
  )
  .get("/calibration", zValidator("query", calibrationQuerySchema), async (c) => {
    const q = c.req.valid("query");
    const db = createDb(c.env.DB);

    const cohortPrefix = `${q.surface}|${q.model}|${q.model_version}|`;
    const rows = await db
      .select()
      .from(uncertaintyCalibrationSnapshot)
      .where(like(uncertaintyCalibrationSnapshot.cohortKey, `${cohortPrefix}%`))
      .orderBy(uncertaintyCalibrationSnapshot.bucketLower);

    return c.json({ buckets: rows });
  })
  .get("/orphans", async (c) => {
    const db = createDb(c.env.DB);

    const rows = await db
      .select({
        surface: uncertaintyPrediction.surface,
        orphan_count: count(sql`CASE WHEN ${uncertaintyPrediction.state} = 'orphaned' THEN 1 END`),
        emitted_count: count(sql`CASE WHEN ${uncertaintyPrediction.state} = 'emitted' THEN 1 END`),
        witnessed_count: count(
          sql`CASE WHEN ${uncertaintyPrediction.state} = 'witnessed' THEN 1 END`,
        ),
        total: count(),
      })
      .from(uncertaintyPrediction)
      .groupBy(uncertaintyPrediction.surface);

    return c.json({ surfaces: rows });
  });

const internalRoutes = new Hono<HonoEnv>().post("/orphan-sweep", async (c) => {
  if (!authorizeCron({ req: { header: (n) => c.req.header(n) }, env: c.env })) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const db = createDb(c.env.DB);
  const result = await sweepOrphans(db);
  return c.json(result);
});

uncertaintyRoutes.route("/internal", internalRoutes);

export { uncertaintyRoutes };
