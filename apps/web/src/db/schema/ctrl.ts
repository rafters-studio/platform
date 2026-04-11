import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

export const ctrlPreferences = sqliteTable(
  "ctrl_preferences",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: text("user_id").notNull(),
    dashboard: text("dashboard").notNull().default("{}"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_ctrl_preferences_user").on(table.userId)],
);

export const ctrlNotification = sqliteTable(
  "ctrl_notification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: text("user_id").notNull(),
    surface: text("surface").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    detail: text("detail"),
    url: text("url"),
    isRead: integer("is_read").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (table) => [
    index("idx_ctrl_notification_user_read").on(table.userId, table.isRead),
    index("idx_ctrl_notification_created").on(table.createdAt),
  ],
);

export const ctrlProperty = sqliteTable(
  "ctrl_property",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: text("name").notNull().unique(),
    domain: text("domain").notNull(),
    repoOwner: text("repo_owner").notNull(),
    repoName: text("repo_name").notNull(),
    contentPath: text("content_path"),
    emailDomain: text("email_domain"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date()),
  },
  () => [],
);
