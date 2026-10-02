import Anthropic from "@anthropic-ai/sdk";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { findExact, store } from "../../src/color/cache";
import app from "../../src/index";
import { colorKey } from "../../src/color/key";
import { toOKLab } from "../../src/color/oklab";
import type { ColorResponse } from "../../src/color/route";
import { createTestD1 } from "../helpers/d1";

const generateIntelligence = vi.hoisted(() => vi.fn());
const generateLabelCandidates = vi.hoisted(() => vi.fn());
vi.mock("../../src/color/intelligence", () => ({
  INTELLIGENCE_MODEL: "test-model",
  generateIntelligence,
  generateLabelCandidates,
}));

const TEXT = {
  reasoning: "r",
  emotionalImpact: "e",
  culturalContext: "c",
  accessibilityNotes: "a",
  usageGuidance: "u",
  balancingGuidance: "b",
};

function generated(...candidates: string[]) {
  return { text: TEXT, candidates };
}

function env(db: D1Database = createTestD1()) {
  return { rafters_platform: db, CF_API_KEY: "acct", CF_WORKER_AI_KEY: "token" };
}

async function get(path: string, bindings: ReturnType<typeof env>) {
  const res = await app.request(`/api/color/${path}`, {}, bindings);
  return { status: res.status, body: (await res.json()) as ColorResponse };
}

async function seed(db: D1Database, l: number, label: string | null) {
  const oklch = { l, c: 0.1, h: 240, alpha: 1 };
  await store(db, {
    key: colorKey(oklch),
    lab: toOKLab(oklch),
    label,
    text: TEXT,
    model: "test-model",
  });
}

async function storedLabel(db: D1Database, key: string) {
  return (await findExact(db, key))?.label ?? null;
}

const KEY = "0.500-0.100-240";

beforeEach(() => {
  generateIntelligence.mockReset();
  generateLabelCandidates.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/color/:oklch", () => {
  it("returns 400 with a message for a malformed color", async () => {
    const res = await app.request("/api/color/0.5-0.1-240", {}, env());
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/L\.LLL-C\.CCC-H/);
  });

  it("returns 400 for a hue of 360", async () => {
    const res = await app.request("/api/color/0.500-0.100-360", {}, env());
    expect(res.status).toBe(400);
  });

  it("serves an exact hit as found from the cache without calling the model", async () => {
    const bindings = env();
    await seed(bindings.rafters_platform, 0.5, "Harbor Blue");

    const { status, body } = await get(KEY, bindings);
    expect(status).toBe(200);
    expect(body.status).toBe("found");
    expect(body.source).toBe("cache");
    expect(body.color.intelligence?.label).toBe("Harbor Blue");
    expect(body.color.scale).toHaveLength(11);
    expect(generateIntelligence).not.toHaveBeenCalled();
  });

  it("serves a near hit inside 0.02 as approximate from the cache", async () => {
    const bindings = env();
    await seed(bindings.rafters_platform, 0.51, "Harbor Blue");

    const { body } = await get(KEY, bindings);
    expect(body.status).toBe("approximate");
    expect(body.source).toBe("cache");
    expect(body.nearest?.key).toBe("0.510-0.100-240");
    expect(body.nearest?.deltaE).toBeLessThanOrEqual(0.02);
    expect(generateIntelligence).not.toHaveBeenCalled();
  });

  it("generates when the nearest cached color is outside 0.02", async () => {
    const bindings = env();
    await seed(bindings.rafters_platform, 0.55, "Far Blue");
    generateIntelligence.mockResolvedValue(generated("Harbor Blue", "Second", "Third"));

    const first = await get(KEY, bindings);
    expect(first.body.status).toBe("found");
    expect(first.body.source).toBe("generated");
    expect(first.body.color.intelligence?.label).toBe("Harbor Blue");

    const second = await get(KEY, bindings);
    expect(second.body.source).toBe("cache");
    expect(generateIntelligence).toHaveBeenCalledTimes(1);
  });

  it("passes the labels of nearby cached colors to the model", async () => {
    const bindings = env();
    await seed(bindings.rafters_platform, 0.55, "Far Blue");
    generateIntelligence.mockResolvedValue(generated("Harbor Blue"));

    await get(KEY, bindings);
    expect(generateIntelligence.mock.calls[0]?.[3]).toEqual(["Far Blue"]);
  });
});

describe("label selection", () => {
  it("takes the first candidate", async () => {
    const bindings = env();
    generateIntelligence.mockResolvedValue(generated("First Pick", "Second Pick", "Third Pick"));
    await get(KEY, bindings);
    expect(await storedLabel(bindings.rafters_platform, KEY)).toBe("First Pick");
  });

  it("skips a candidate already used, ignoring case", async () => {
    const bindings = env();
    await seed(bindings.rafters_platform, 0.9, "First Pick");
    generateIntelligence.mockResolvedValue(generated("first pick", "Second Pick", "Third Pick"));
    await get(KEY, bindings);
    expect(await storedLabel(bindings.rafters_platform, KEY)).toBe("Second Pick");
  });

  it("skips a candidate with a banned term", async () => {
    const bindings = env();
    generateIntelligence.mockResolvedValue(generated("Bloody Rose", "Dusk Rose", "Third Pick"));
    await get(KEY, bindings);
    expect(await storedLabel(bindings.rafters_platform, KEY)).toBe("Dusk Rose");
  });

  it("calls the model once more with the rejected labels when none pass", async () => {
    const bindings = env();
    await seed(bindings.rafters_platform, 0.9, "Taken One");
    generateIntelligence.mockResolvedValue(generated("Taken One", "Bloody Rose", "Skin Tone"));
    generateLabelCandidates.mockResolvedValue(["Fresh Pick", "Other", "Another"]);

    await get(KEY, bindings);
    expect(generateLabelCandidates).toHaveBeenCalledTimes(1);
    const rejected = generateLabelCandidates.mock.calls[0]?.[4] as { label: string }[];
    expect(rejected.map((r) => r.label)).toEqual(["Bloody Rose", "Skin Tone", "Taken One"]);
    expect(await storedLabel(bindings.rafters_platform, KEY)).toBe("Fresh Pick");
  });

  it("stores a NULL label and logs when the retry also fails every candidate", async () => {
    const bindings = env();
    generateIntelligence.mockResolvedValue(generated("Bloody Rose", "Skin Tone", "War Paint"));
    generateLabelCandidates.mockResolvedValue(["Gun Metal", "Sexy Red", "Death Blue"]);

    const { body } = await get(KEY, bindings);
    expect(body.status).toBe("found");
    expect(body.color.intelligence?.label).toBeUndefined();
    expect(body.color.intelligence?.reasoning).toBe("r");
    expect(await storedLabel(bindings.rafters_platform, KEY)).toBeNull();
    expect(await findExact(bindings.rafters_platform, KEY)).not.toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("no usable label"));
  });

  it("uses the next candidate when a concurrent request takes the label at insert", async () => {
    const real = createTestD1();
    let raced = false;
    const racing = {
      prepare(sql: string) {
        if (!raced && sql.includes("INSERT INTO color_cache")) {
          raced = true;
          void seed(real, 0.9, "First Pick");
        }
        return real.prepare(sql);
      },
    } as unknown as D1Database;
    generateIntelligence.mockResolvedValue(generated("First Pick", "Second Pick", "Third Pick"));

    const { body } = await get(KEY, env(racing));
    expect(body.color.intelligence?.label).toBe("Second Pick");
    expect(await storedLabel(real, KEY)).toBe("Second Pick");
  });

  it("stores a NULL label when the race takes every remaining candidate", async () => {
    const real = createTestD1();
    let raced = false;
    const racing = {
      prepare(sql: string) {
        if (!raced && sql.includes("INSERT INTO color_cache")) {
          raced = true;
          void seed(real, 0.9, "Only Pick");
        }
        return real.prepare(sql);
      },
    } as unknown as D1Database;
    generateIntelligence.mockResolvedValue(generated("Only Pick"));

    const { body } = await get(KEY, env(racing));
    expect(body.color.intelligence?.label).toBeUndefined();
    expect(await storedLabel(real, KEY)).toBeNull();
  });
});

describe("generation failures", () => {
  it("answers 200 with a busy error and stores nothing on a 429", async () => {
    const bindings = env();
    generateIntelligence.mockRejectedValue(
      new Anthropic.RateLimitError(429, undefined, "rate limited", new Headers()),
    );

    const { status, body } = await get(KEY, bindings);
    expect(status).toBe(200);
    expect(body.status).toBe("error");
    expect(body.error).toBe("Color intelligence is busy; try again in a minute");
    expect(body.color.intelligence).toBeUndefined();
    expect(await findExact(bindings.rafters_platform, KEY)).toBeNull();
  });

  it("answers 200 with the error message and stores nothing on another failure", async () => {
    const bindings = env();
    generateIntelligence.mockRejectedValue(new Error("Color intelligence response was cut off"));

    const { status, body } = await get(KEY, bindings);
    expect(status).toBe(200);
    expect(body.status).toBe("error");
    expect(body.error).toBe("Color intelligence response was cut off");
    expect(body.color.intelligence).toBeUndefined();
    expect(await findExact(bindings.rafters_platform, KEY)).toBeNull();
  });
});
