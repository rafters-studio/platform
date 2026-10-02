import { describe, expect, it } from "vite-plus/test";
import {
  findExact,
  findNearest,
  isLabelConflict,
  labelTaken,
  NEAR_MATCH_DELTA_E,
  nearbyLabels,
  store,
} from "../../src/color/cache";
import { colorKey } from "../../src/color/key";
import { toOKLab } from "../../src/color/oklab";
import { createTestD1 } from "../helpers/d1";

function text() {
  return {
    reasoning: "r",
    emotionalImpact: "e",
    culturalContext: "c",
    accessibilityNotes: "a",
    usageGuidance: "u",
    balancingGuidance: "b",
  };
}

async function seed(db: D1Database, l: number, c: number, h: number, label: string) {
  const oklch = { l, c, h, alpha: 1 };
  await store(db, {
    key: colorKey(oklch),
    lab: toOKLab(oklch),
    label,
    text: text(),
    model: "test-model",
  });
}

describe("findExact", () => {
  it("returns stored intelligence for the key and null for a miss", async () => {
    const db = createTestD1();
    await seed(db, 0.5, 0.1, 240, "Navy");
    expect((await findExact(db, "0.500-0.100-240"))?.label).toBe("Navy");
    expect(await findExact(db, "0.500-0.100-241")).toBeNull();
  });

  it("keeps the first write when the same key is stored twice", async () => {
    const db = createTestD1();
    await seed(db, 0.5, 0.1, 240, "First");
    await seed(db, 0.5, 0.1, 240, "Second");
    expect((await findExact(db, "0.500-0.100-240"))?.label).toBe("First");
  });
});

describe("findNearest", () => {
  it("returns the closest cached color within the threshold", async () => {
    const db = createTestD1();
    await seed(db, 0.5, 0.1, 240, "Near");
    await seed(db, 0.51, 0.1, 240, "Nearer");
    const match = await findNearest(db, toOKLab({ l: 0.508, c: 0.1, h: 240, alpha: 1 }));
    expect(match?.intelligence.label).toBe("Nearer");
    expect(match?.key).toBe("0.510-0.100-240");
    expect(match?.deltaE).toBeLessThanOrEqual(NEAR_MATCH_DELTA_E);
  });

  it("returns null when the closest color is beyond the threshold", async () => {
    const db = createTestD1();
    await seed(db, 0.5, 0.1, 240, "Far");
    expect(await findNearest(db, toOKLab({ l: 0.53, c: 0.1, h: 240, alpha: 1 }))).toBeNull();
  });

  it("rejects a candidate inside the box but outside the sphere", async () => {
    const db = createTestD1();
    // 0.015 off on each of L, a, b: inside the 0.02 box, about 0.026 away.
    const stored = { l: 0.5, a: 0.05, b: 0.05 };
    await store(db, { key: "box-corner", lab: stored, label: "Corner", text: text(), model: "m" });
    expect(await findNearest(db, { l: 0.515, a: 0.065, b: 0.065 })).toBeNull();
  });

  it("matches across the 0/360 hue boundary", async () => {
    const db = createTestD1();
    await seed(db, 0.6, 0.15, 359, "Wrapped");
    const match = await findNearest(db, toOKLab({ l: 0.6, c: 0.15, h: 1, alpha: 1 }));
    expect(match?.intelligence.label).toBe("Wrapped");
  });

  it("matches near-grays whatever their hue", async () => {
    const db = createTestD1();
    await seed(db, 0.6, 0, 0, "Gray");
    const match = await findNearest(db, toOKLab({ l: 0.6, c: 0.004, h: 200, alpha: 1 }));
    expect(match?.intelligence.label).toBe("Gray");
  });
});

describe("labels", () => {
  it("round-trips a stored color's six fields and label", async () => {
    const db = createTestD1();
    await seed(db, 0.5, 0.1, 240, "Navy");
    expect(await findExact(db, "0.500-0.100-240")).toEqual({ label: "Navy", ...text() });
  });

  it("omits the label of a color stored with a NULL label", async () => {
    const db = createTestD1();
    await store(db, {
      key: "k",
      lab: { l: 0.5, a: 0, b: 0 },
      label: null,
      text: text(),
      model: "m",
    });
    expect(await findExact(db, "k")).toEqual(text());
  });

  it("allows many colors with a NULL label", async () => {
    const db = createTestD1();
    const lab = { l: 0.5, a: 0, b: 0 };
    await store(db, { key: "k1", lab, label: null, text: text(), model: "m" });
    await store(db, { key: "k2", lab, label: null, text: text(), model: "m" });
    expect(await findExact(db, "k2")).not.toBeNull();
  });

  it("finds a taken label ignoring case", async () => {
    const db = createTestD1();
    await seed(db, 0.5, 0.1, 240, "Harbor Blue");
    expect(await labelTaken(db, "harbor BLUE")).toBe(true);
    expect(await labelTaken(db, "Harbor Green")).toBe(false);
  });

  it("rejects a duplicate label ignoring case and recognizes the conflict", async () => {
    const db = createTestD1();
    await seed(db, 0.5, 0.1, 240, "Harbor Blue");
    const failure = await seed(db, 0.6, 0.1, 240, "HARBOR BLUE").catch((e: unknown) => e);
    expect(isLabelConflict(failure)).toBe(true);
  });

  it("lists nearby labels nearest first and skips far ones", async () => {
    const db = createTestD1();
    await seed(db, 0.55, 0.1, 240, "Mid");
    await seed(db, 0.51, 0.1, 240, "Close");
    await seed(db, 0.9, 0.1, 240, "Far");
    expect(await nearbyLabels(db, toOKLab({ l: 0.5, c: 0.1, h: 240, alpha: 1 }))).toEqual([
      "Close",
      "Mid",
    ]);
  });

  it("caps nearby labels at 20", async () => {
    const db = createTestD1();
    for (let i = 0; i < 25; i++) await seed(db, 0.5 + i * 0.001, 0.1, 240, `Label ${i}`);
    expect(await nearbyLabels(db, toOKLab({ l: 0.5, c: 0.1, h: 240, alpha: 1 }))).toHaveLength(20);
  });
});
