import { z } from "zod";

export const emailSearchSchema = z.object({
  mailbox: z.string().optional(),
  folder: z.string().optional(),
  status: z.enum(["all", "open", "pending", "resolved"]).optional(),
  priority: z.enum(["all", "urgent", "high", "normal", "low"]).optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
});

export const listenSearchSchema = z.object({
  q: z.string().optional(),
  mode: z.enum(["semantic", "keyword"]).optional(),
  source: z.string().optional(),
});

export const contentSearchSchema = z.object({
  path: z.string().optional(),
});

export const analyticsSearchSchema = z.object({
  propertyId: z.string().optional(),
  period: z.enum(["7d", "30d"]).optional(),
});

export const teamSearchSchema = z.object({
  tab: z.enum(["bullpen", "tasks", "schedules"]).optional(),
  agent: z.string().optional(),
});
