import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tableName: text("table_name").notNull(),
    recordId: text("record_id").notNull(),
    action: text("action").notNull(),
    oldData: text("old_data"),
    newData: text("new_data"),
    userId: text("user_id"),
    polarEventId: text("polar_event_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (table) => [
    index("idx_audit_log_table_record").on(table.tableName, table.recordId),
    index("idx_audit_log_user_id").on(table.userId),
    index("idx_audit_log_action").on(table.action),
    index("idx_audit_log_created_at").on(table.createdAt),
    uniqueIndex("idx_audit_log_polar_event_id").on(table.polarEventId),
  ],
);
