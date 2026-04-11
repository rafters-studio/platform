import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { ctrlPreferences, ctrlNotification, ctrlProperty } from "./ctrl";

export const insertCtrlPreferencesSchema = createInsertSchema(ctrlPreferences);
export const selectCtrlPreferencesSchema = createSelectSchema(ctrlPreferences);

export type InsertCtrlPreferences = z.infer<typeof insertCtrlPreferencesSchema>;
export type SelectCtrlPreferences = z.infer<typeof selectCtrlPreferencesSchema>;

export const insertCtrlNotificationSchema = createInsertSchema(ctrlNotification);
export const selectCtrlNotificationSchema = createSelectSchema(ctrlNotification);

export type InsertCtrlNotification = z.infer<typeof insertCtrlNotificationSchema>;
export type SelectCtrlNotification = z.infer<typeof selectCtrlNotificationSchema>;

export const insertCtrlPropertySchema = createInsertSchema(ctrlProperty);
export const selectCtrlPropertySchema = createSelectSchema(ctrlProperty);

export type InsertCtrlProperty = z.infer<typeof insertCtrlPropertySchema>;
export type SelectCtrlProperty = z.infer<typeof selectCtrlPropertySchema>;
