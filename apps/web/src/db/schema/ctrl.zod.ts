import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { ctrlPreferences } from "./ctrl";

export const insertCtrlPreferencesSchema = createInsertSchema(ctrlPreferences);
export const selectCtrlPreferencesSchema = createSelectSchema(ctrlPreferences);

export type InsertCtrlPreferences = z.infer<typeof insertCtrlPreferencesSchema>;
export type SelectCtrlPreferences = z.infer<typeof selectCtrlPreferencesSchema>;
