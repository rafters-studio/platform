import { and, eq, lt } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { uncertaintyPrediction } from "../../../../src/db/schema/uncertainty";

describe("orphan sweep WHERE clause", () => {
  it("filters on state='emitted' AND orphan_after < cutoff", () => {
    // Documents the predicate shape the sweep relies on. If either side
    // shifts, the index (state, orphan_after) needs to be revisited.
    const cutoff = new Date(1_700_000_000_000);
    const clause = and(
      eq(uncertaintyPrediction.state, "emitted"),
      lt(uncertaintyPrediction.orphanAfter, cutoff),
    );
    expect(clause).toBeDefined();
    expect(uncertaintyPrediction.state.name).toBe("state");
    expect(uncertaintyPrediction.orphanAfter.name).toBe("orphan_after");
  });
});
