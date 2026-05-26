import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { runOrphanSweep } from "../../../apps/web/src/cron/orphan-sweep";

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM uncertainty_prediction").run();
});

async function insertPrediction(opts: {
  id: string;
  state: "emitted" | "witnessed" | "orphaned";
  orphanAfter: number;
}) {
  const cohortKey = "test.surface::test-model::v1";
  await env.DB.prepare(
    `INSERT INTO uncertainty_prediction (
      id, surface, feature_key, input_fingerprint, model, model_version,
      claimed_confidence, prediction_payload, state, created_at, orphan_after, cohort_key
    ) VALUES (?, 'test.surface', 'fk', 'fp', 'test-model', 'v1', 0.5, '{}', ?, ?, ?, ?)`,
  )
    .bind(opts.id, opts.state, Date.now(), opts.orphanAfter, cohortKey)
    .run();
}

describe("runOrphanSweep", () => {
  it("flips emitted -> orphaned when orphan_after has passed", async () => {
    await insertPrediction({
      id: "01970000-0000-0000-0000-000000000001",
      state: "emitted",
      orphanAfter: Date.now() - 1000,
    });

    const count = await runOrphanSweep(env.DB);
    expect(count).toBe(1);

    const after = await env.DB.prepare("SELECT state FROM uncertainty_prediction WHERE id = ?")
      .bind("01970000-0000-0000-0000-000000000001")
      .first<{ state: string }>();
    expect(after?.state).toBe("orphaned");
  });

  it("leaves emitted predictions alone when orphan_after is in the future", async () => {
    await insertPrediction({
      id: "01970000-0000-0000-0000-000000000002",
      state: "emitted",
      orphanAfter: Date.now() + 60_000,
    });

    const count = await runOrphanSweep(env.DB);
    expect(count).toBe(0);

    const after = await env.DB.prepare("SELECT state FROM uncertainty_prediction WHERE id = ?")
      .bind("01970000-0000-0000-0000-000000000002")
      .first<{ state: string }>();
    expect(after?.state).toBe("emitted");
  });

  it("does not touch witnessed predictions even when orphan_after has passed", async () => {
    await insertPrediction({
      id: "01970000-0000-0000-0000-000000000003",
      state: "witnessed",
      orphanAfter: Date.now() - 1000,
    });

    const count = await runOrphanSweep(env.DB);
    expect(count).toBe(0);

    const after = await env.DB.prepare("SELECT state FROM uncertainty_prediction WHERE id = ?")
      .bind("01970000-0000-0000-0000-000000000003")
      .first<{ state: string }>();
    expect(after?.state).toBe("witnessed");
  });

  it("does not re-flip already-orphaned predictions", async () => {
    await insertPrediction({
      id: "01970000-0000-0000-0000-000000000004",
      state: "orphaned",
      orphanAfter: Date.now() - 1000,
    });

    const count = await runOrphanSweep(env.DB);
    expect(count).toBe(0);
  });
});
