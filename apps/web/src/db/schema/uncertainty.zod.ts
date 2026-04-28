import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { uncertaintyCalibrationSnapshot, uncertaintyPrediction } from "./uncertainty";

const predictionState = z.enum(["emitted", "witnessed", "orphaned", "retired"]);
const outcomeLabel = z.enum(["accepted", "rejected", "edited", "ignored", "custom"]);
const unitInterval = z.number().min(0).max(1);

const calibrationSnapshotOverrides = {
  bucketLower: unitInterval,
  bucketUpper: unitInterval,
  claimedConfidence: unitInterval,
  actualCorrectness: unitInterval,
  predictionCount: z.number().int().nonnegative(),
  orphanCount: z.number().int().nonnegative(),
  brierScore: unitInterval,
};

export const insertUncertaintyPredictionSchema = createInsertSchema(uncertaintyPrediction, {
  state: predictionState,
  outcomeLabel: outcomeLabel.nullable().optional(),
  claimedConfidence: unitInterval,
  outcomeCorrectness: unitInterval.nullable().optional(),
});

export const selectUncertaintyPredictionSchema = createSelectSchema(uncertaintyPrediction, {
  state: predictionState,
  outcomeLabel: outcomeLabel.nullable(),
  claimedConfidence: unitInterval,
  outcomeCorrectness: unitInterval.nullable(),
});

export const insertUncertaintyCalibrationSnapshotSchema = createInsertSchema(
  uncertaintyCalibrationSnapshot,
  calibrationSnapshotOverrides,
);

export const selectUncertaintyCalibrationSnapshotSchema = createSelectSchema(
  uncertaintyCalibrationSnapshot,
  calibrationSnapshotOverrides,
);

export type InsertUncertaintyPrediction = z.infer<typeof insertUncertaintyPredictionSchema>;
export type SelectUncertaintyPrediction = z.infer<typeof selectUncertaintyPredictionSchema>;
export type InsertUncertaintyCalibrationSnapshot = z.infer<
  typeof insertUncertaintyCalibrationSnapshotSchema
>;
export type SelectUncertaintyCalibrationSnapshot = z.infer<
  typeof selectUncertaintyCalibrationSnapshotSchema
>;
