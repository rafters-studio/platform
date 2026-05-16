import type { createDb } from "../../db/client";
import { auditLog } from "../../db/schema/audit";

interface PolarWebhookPayload {
  type: string;
  timestamp: Date;
  data: { id?: string } & Record<string, unknown>;
}

export async function writePolarAudit(
  db: ReturnType<typeof createDb>,
  payload: PolarWebhookPayload,
): Promise<void> {
  const resourceId = payload.data.id ?? "unknown";
  const polarEventId = `${payload.type}:${resourceId}:${payload.timestamp.toISOString()}`;

  await db
    .insert(auditLog)
    .values({
      tableName: "polar_webhook",
      recordId: resourceId,
      action: payload.type,
      newData: JSON.stringify(payload.data),
      polarEventId,
    })
    .onConflictDoNothing({ target: auditLog.polarEventId });
}
