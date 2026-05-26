import { zValidator } from "@hono/zod-validator";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db/client";
import { uncertaintyCalibrationSnapshot, uncertaintyPrediction } from "../db/schema/uncertainty";
import { requireApiKeyOrSession } from "../middleware/auth";
import type { HonoEnv } from "../types";

export const emitSchema = z.object({
  surface: z.string().min(1),
  feature_key: z.string().min(1),
  input_fingerprint: z.string().min(1),
  model: z.string().min(1),
  model_version: z.string().min(1),
  claimed_confidence: z.number().min(0).max(1),
  prediction_payload: z.unknown(),
  orphan_ttl_days: z.number().int().positive().optional().default(30),
});

export const witnessSchema = z.object({
  outcome_label: z.enum(["accepted", "rejected", "edited", "ignored", "custom"]),
  outcome_correctness: z.number().min(0).max(1),
  outcome_payload: z.unknown().optional(),
});

const calibrationQuerySchema = z.object({
  surface: z.string().min(1),
  model: z.string().min(1),
  model_version: z.string().optional(),
});

const orphansQuerySchema = z.object({
  surface: z.string().min(1).optional(),
});

export const uncertaintyRoutes = new Hono<HonoEnv>()
  .post(
    "/predictions",
    requireApiKeyOrSession("uncertainty:emit"),
    zValidator("json", emitSchema),
    async (c) => {
      const body = c.req.valid("json");
      const db = createDb(c.env.DB);

      const orphanAfter = new Date(Date.now() + body.orphan_ttl_days * 24 * 60 * 60 * 1000);
      const cohortKey = `${body.surface}::${body.model}::${body.model_version}`;

      const [row] = await db
        .insert(uncertaintyPrediction)
        .values({
          surface: body.surface,
          featureKey: body.feature_key,
          inputFingerprint: body.input_fingerprint,
          model: body.model,
          modelVersion: body.model_version,
          claimedConfidence: body.claimed_confidence,
          predictionPayload: JSON.stringify(body.prediction_payload),
          state: "emitted",
          orphanAfter,
          cohortKey,
        })
        .returning({
          id: uncertaintyPrediction.id,
          orphanAfter: uncertaintyPrediction.orphanAfter,
        });

      return c.json({ id: row.id, orphan_after: row.orphanAfter });
    },
  )

  .put(
    "/predictions/:id/witness",
    requireApiKeyOrSession("uncertainty:witness"),
    zValidator("json", witnessSchema),
    async (c) => {
      const id = c.req.param("id");
      const body = c.req.valid("json");
      const db = createDb(c.env.DB);

      const existing = await db
        .select({ state: uncertaintyPrediction.state })
        .from(uncertaintyPrediction)
        .where(eq(uncertaintyPrediction.id, id))
        .get();

      if (!existing) return c.json({ error: "Not found" }, 404);
      if (existing.state === "witnessed") return c.json({ error: "Already witnessed" }, 409);

      await db
        .update(uncertaintyPrediction)
        .set({
          state: "witnessed",
          outcomeLabel: body.outcome_label,
          outcomeCorrectness: body.outcome_correctness,
          outcomePayload: body.outcome_payload ? JSON.stringify(body.outcome_payload) : null,
          witnessedAt: new Date(),
        })
        .where(eq(uncertaintyPrediction.id, id));

      return c.json({ ok: true });
    },
  )

  .get(
    "/calibration",
    requireApiKeyOrSession("uncertainty:read"),
    zValidator("query", calibrationQuerySchema),
    async (c) => {
      const { surface, model, model_version } = c.req.valid("query");
      const db = createDb(c.env.DB);

      const cohortKey = model_version ? `${surface}::${model}::${model_version}` : undefined;

      const rows = await db
        .select()
        .from(uncertaintyCalibrationSnapshot)
        .where(
          cohortKey
            ? eq(uncertaintyCalibrationSnapshot.cohortKey, cohortKey)
            : and(
                gte(uncertaintyCalibrationSnapshot.cohortKey, `${surface}::${model}::`),
                lt(uncertaintyCalibrationSnapshot.cohortKey, `${surface}::${model}:;`),
              ),
        )
        .all();

      return c.json(rows);
    },
  )

  .get(
    "/orphans",
    requireApiKeyOrSession("uncertainty:read"),
    zValidator("query", orphansQuerySchema),
    async (c) => {
      const { surface } = c.req.valid("query");
      const db = createDb(c.env.DB);

      const rows = await db
        .select({
          surface: uncertaintyPrediction.surface,
          orphan_count: sql<number>`count(*)`,
        })
        .from(uncertaintyPrediction)
        .where(
          and(
            eq(uncertaintyPrediction.state, "orphaned"),
            surface ? eq(uncertaintyPrediction.surface, surface) : undefined,
          ),
        )
        .groupBy(uncertaintyPrediction.surface)
        .all();

      return c.json(rows);
    },
  );
