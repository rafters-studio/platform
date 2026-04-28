import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { uuidv7 } from "uuidv7";

export const uncertaintyPrediction = sqliteTable(
  "uncertainty_prediction",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    surface: text("surface").notNull(),
    featureKey: text("feature_key").notNull(),
    inputFingerprint: text("input_fingerprint").notNull(),
    model: text("model").notNull(),
    modelVersion: text("model_version").notNull(),
    claimedConfidence: real("claimed_confidence").notNull(),
    predictionPayload: text("prediction_payload", { mode: "json" }).notNull(),
    state: text("state", { enum: ["emitted", "witnessed", "orphaned", "retired"] }).notNull(),
    outcomeLabel: text("outcome_label"),
    outcomePayload: text("outcome_payload", { mode: "json" }),
    outcomeCorrectness: real("outcome_correctness"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    witnessedAt: integer("witnessed_at", { mode: "timestamp_ms" }),
    orphanAfter: integer("orphan_after", { mode: "timestamp_ms" }).notNull(),
    cohortKey: text("cohort_key").notNull(),
  },
  (table) => [
    index("idx_uncertainty_prediction_cohort").on(table.cohortKey),
    index("idx_uncertainty_prediction_surface").on(table.surface),
    index("idx_uncertainty_prediction_state").on(table.state),
    index("idx_uncertainty_prediction_orphan_sweep").on(table.state, table.orphanAfter),
  ],
);

export const uncertaintyCalibrationSnapshot = sqliteTable(
  "uncertainty_calibration_snapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    cohortKey: text("cohort_key").notNull(),
    bucketLower: real("bucket_lower").notNull(),
    bucketUpper: real("bucket_upper").notNull(),
    claimedConfidence: real("claimed_confidence").notNull(),
    actualCorrectness: real("actual_correctness").notNull(),
    predictionCount: integer("prediction_count").notNull(),
    orphanCount: integer("orphan_count").notNull(),
    brierScore: real("brier_score").notNull(),
    computedAt: integer("computed_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (table) => [index("idx_uncertainty_calibration_snapshot_cohort").on(table.cohortKey)],
);
