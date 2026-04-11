import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { user } from "./auth";

export const ctrlPreferences = sqliteTable(
  "ctrl_preferences",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    dashboard: text("dashboard").notNull().default("{}"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_ctrl_preferences_user").on(table.userId),
    unique("uq_ctrl_preferences_user").on(table.userId),
  ],
);
