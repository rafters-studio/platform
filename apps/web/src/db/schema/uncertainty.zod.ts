import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { uncertaintyCalibrationSnapshot, uncertaintyPrediction } from "./uncertainty";

const predictionState = z.enum(["emitted", "witnessed", "orphaned", "retired"]);
const outcomeLabel = z.enum(["accepted", "rejected", "edited", "ignored", "custom"]);

export const insertUncertaintyPredictionSchema = createInsertSchema(uncertaintyPrediction, {
  state: predictionState,
  outcomeLabel: outcomeLabel.nullable().optional(),
  claimedConfidence: z.number().min(0).max(1),
  outcomeCorrectness: z.number().min(0).max(1).nullable().optional(),
});

export const selectUncertaintyPredictionSchema = createSelectSchema(uncertaintyPrediction, {
  state: predictionState,
  outcomeLabel: outcomeLabel.nullable(),
  claimedConfidence: z.number().min(0).max(1),
  outcomeCorrectness: z.number().min(0).max(1).nullable(),
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

export type InsertUncertaintyPrediction = z.infer<typeof insertUncertaintyPredictionSchema>;
export type SelectUncertaintyPrediction = z.infer<typeof selectUncertaintyPredictionSchema>;
export type InsertUncertaintyCalibrationSnapshot = z.infer<
  typeof insertUncertaintyCalibrationSnapshotSchema
>;
export type SelectUncertaintyCalibrationSnapshot = z.infer<
  typeof selectUncertaintyCalibrationSnapshotSchema
>;
