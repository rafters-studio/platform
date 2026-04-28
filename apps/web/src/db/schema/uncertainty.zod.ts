import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { uncertaintyCalibrationSnapshot, uncertaintyPrediction } from "./uncertainty";

export const predictionStateSchema = z.enum(["emitted", "witnessed", "orphaned", "retired"]);

export const outcomeLabelSchema = z.enum(["accepted", "rejected", "edited", "ignored", "custom"]);

export const surfaceSchema = z.string().min(1).max(64);

export const insertUncertaintyPredictionSchema = createInsertSchema(uncertaintyPrediction, {
  claimedConfidence: z.number().min(0).max(1),
  outcomeCorrectness: z.number().min(0).max(1).nullable().optional(),
  state: predictionStateSchema,
});

export const selectUncertaintyPredictionSchema = createSelectSchema(uncertaintyPrediction, {
  claimedConfidence: z.number().min(0).max(1),
  outcomeCorrectness: z.number().min(0).max(1).nullable(),
  state: predictionStateSchema,
});

export const insertUncertaintyCalibrationSnapshotSchema = createInsertSchema(
  uncertaintyCalibrationSnapshot,
  {
    bucketLower: z.number().min(0).max(1),
    bucketUpper: z.number().min(0).max(1),
    claimedConfidence: z.number().min(0).max(1),
    actualCorrectness: z.number().min(0).max(1),
    predictionCount: z.number().int().nonnegative(),
    orphanCount: z.number().int().nonnegative(),
    brierScore: z.number().min(0).max(1),
  },
);

export const selectUncertaintyCalibrationSnapshotSchema = createSelectSchema(
  uncertaintyCalibrationSnapshot,
);

export type InsertUncertaintyPrediction = z.infer<typeof insertUncertaintyPredictionSchema>;
export type SelectUncertaintyPrediction = z.infer<typeof selectUncertaintyPredictionSchema>;
export type InsertUncertaintyCalibrationSnapshot = z.infer<
  typeof insertUncertaintyCalibrationSnapshotSchema
>;
export type SelectUncertaintyCalibrationSnapshot = z.infer<
  typeof selectUncertaintyCalibrationSnapshotSchema
>;
export type PredictionState = z.infer<typeof predictionStateSchema>;
export type OutcomeLabel = z.infer<typeof outcomeLabelSchema>;
