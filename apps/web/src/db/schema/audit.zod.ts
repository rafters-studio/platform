import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { auditLog } from "./audit";

export const insertAuditLogSchema = createInsertSchema(auditLog);
export const selectAuditLogSchema = createSelectSchema(auditLog);

export const auditActionSchema = z.enum(["INSERT", "UPDATE", "SOFT_DELETE", "DELETE"]);

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type SelectAuditLog = z.infer<typeof selectAuditLogSchema>;
export type AuditAction = z.infer<typeof auditActionSchema>;
