import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "../../../../apps/web/src/db/client";
import { auditLog } from "../../../../apps/web/src/db/schema/audit";
import { writePolarAudit } from "../../../../apps/web/src/lib/audit/polar-webhook";

function payload(type: string, id: string, ts: Date) {
  return {
    type,
    timestamp: ts,
    data: { id, customer_id: "cus_123", amount_total: 1000 },
  };
}

// Idempotency tests require D1 migrations applied at test setup (applyD1Migrations
// from cloudflare:test). Skipped here; verified end-to-end by #126 e2e suite against
// a deployed worker with a Polar test event payload.
describe.skip("writePolarAudit (D1-backed; needs migrations applied)", () => {
  it("writes a row with polar_event_id keyed by type:id:timestamp", async () => {
    const db = createDb(env.DB);
    const ts = new Date("2026-05-15T12:00:00Z");
    await writePolarAudit(db, payload("order.created", "order_a", ts));

    const rows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.polarEventId, `order.created:order_a:${ts.toISOString()}`))
      .all();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tableName: "polar_webhook",
      recordId: "order_a",
      action: "order.created",
    });
  });

  it("dedupes redelivered events (same type+id+timestamp)", async () => {
    const db = createDb(env.DB);
    const ts = new Date("2026-05-15T13:00:00Z");
    await writePolarAudit(db, payload("order.paid", "order_b", ts));
    await writePolarAudit(db, payload("order.paid", "order_b", ts));

    const rows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.polarEventId, `order.paid:order_b:${ts.toISOString()}`))
      .all();

    expect(rows).toHaveLength(1);
  });

  it("treats different event types on the same resource as distinct", async () => {
    const db = createDb(env.DB);
    const ts = new Date("2026-05-15T14:00:00Z");
    await writePolarAudit(db, payload("order.created", "order_c", ts));
    await writePolarAudit(db, payload("order.paid", "order_c", ts));

    const rows = await db.select().from(auditLog).where(eq(auditLog.recordId, "order_c")).all();

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.action).sort()).toEqual(["order.created", "order.paid"]);
  });
});
