import { describe, expect, it } from "vitest";
import type { ColorValue } from "@rafters/shared/types";
import {
  buildEmbeddingText,
  buildQueryFilter,
  buildVectorMetadata,
  generateEmbedding,
  getChromaCategory,
  getHueCategory,
  getLightnessCategory,
  parseVectorMetadata,
  VECTORIZE_DIMENSIONS,
} from "../../../../apps/web/src/lib/color/vector";

function colorFixture(overrides: Partial<ColorValue> = {}): ColorValue {
  return {
    name: "ocean-blue",
    scale: {
      5: { l: 0.5, c: 0.12, h: 240, alpha: 1 },
    },
    ...overrides,
  } as ColorValue;
}

describe("category boundaries (the written rule, rafters vector.ts)", () => {
  it.each([
    [0, 0.01, "neutral"],
    [0, 0.1, "red"],
    [350, 0.1, "red"],
    [15, 0.1, "orange"],
    [45, 0.1, "yellow"],
    [75, 0.1, "green"],
    [165, 0.1, "cyan"],
    [195, 0.1, "blue"],
    [269, 0.1, "blue"],
    [270, 0.1, "purple"],
    [315, 0.1, "magenta"],
    [344, 0.1, "magenta"],
    [345, 0.1, "red"],
  ] as const)("hue %d chroma %d -> %s", (hue, chroma, expected) => {
    expect(getHueCategory(hue, chroma)).toBe(expected);
  });

  it.each([
    [0.1, "dark"],
    [0.35, "mid"],
    [0.5, "mid"],
    [0.65, "mid"],
    [0.66, "light"],
  ] as const)("lightness %d -> %s", (l, expected) => {
    expect(getLightnessCategory(l)).toBe(expected);
  });

  it.each([
    [0.01, "neutral"],
    [0.02, "muted"],
    [0.08, "saturated"],
    [0.18, "vivid"],
  ] as const)("chroma %d -> %s", (c, expected) => {
    expect(getChromaCategory(c)).toBe(expected);
  });
});

describe("metadata round-trip", () => {
  it("buildVectorMetadata -> parseVectorMetadata restores the ColorValue", () => {
    const color = colorFixture({ token: "primary" });
    const metadata = buildVectorMetadata(color);

    expect(metadata.hue_category).toBe("blue");
    expect(metadata.lightness).toBe("mid");
    expect(metadata.chroma).toBe("saturated");
    expect(metadata.token).toBe("primary");

    const parsed = parseVectorMetadata(metadata);
    expect(parsed.color).toEqual(color);
    expect(parsed.token).toBe("primary");
  });

  it("categorizes from scale[5], falling back to scale[0]", () => {
    const color = colorFixture({
      scale: { 0: { l: 0.9, c: 0.01, h: 100, alpha: 1 } } as ColorValue["scale"],
    });
    const metadata = buildVectorMetadata(color);
    expect(metadata.lightness).toBe("light");
    expect(metadata.hue_category).toBe("neutral");
  });
});

describe("buildEmbeddingText", () => {
  it("leads with the deterministic name twice and carries intelligence prose", () => {
    const color = colorFixture({
      intelligence: {
        label: "Harbor Blue",
        reasoning: "calm mid-tone",
        emotionalImpact: "steady and trustworthy",
        culturalContext: "maritime associations",
        accessibilityNotes: "",
        usageGuidance: "primary surfaces",
      },
      analysis: { temperature: "cool", name: "blue" },
    } as Partial<ColorValue>);

    const text = buildEmbeddingText(color);
    expect(text.startsWith("ocean-blue. ocean-blue")).toBe(true);
    expect(text).toContain("steady and trustworthy");
    expect(text).toContain("calm mid-tone");
    expect(text).toContain("maritime associations");
    expect(text).toContain("primary surfaces");
    expect(text).toContain("cool blue");
  });

  it("skips empty fields instead of emitting empty segments", () => {
    const text = buildEmbeddingText(colorFixture());
    expect(text).toBe("ocean-blue. ocean-blue");
  });
});

describe("buildQueryFilter", () => {
  it("returns an empty filter when nothing is set", () => {
    expect(buildQueryFilter({})).toEqual({});
  });

  it("passes scalars through and wraps arrays in $in", () => {
    expect(
      buildQueryFilter({
        hue_category: ["blue", "cyan"],
        lightness: "mid",
        token: "primary",
      }),
    ).toEqual({
      hue_category: { $in: ["blue", "cyan"] },
      lightness: "mid",
      token: "primary",
    });
  });
});

describe("generateEmbedding", () => {
  function stubAi(data: number[][] | undefined): Ai {
    return { run: async () => ({ data }) } as unknown as Ai;
  }

  it("returns the 384-dim vector from the model", async () => {
    const vector = Array.from({ length: VECTORIZE_DIMENSIONS }, (_, i) => i / 1000);
    await expect(generateEmbedding("ocean blue", stubAi([vector]))).resolves.toEqual(vector);
  });

  it("rejects wrong dimensionality instead of storing a malformed vector", async () => {
    await expect(generateEmbedding("ocean blue", stubAi([[1, 2, 3]]))).rejects.toThrow(
      /expected 384 dimensions, got 3/,
    );
  });

  it("rejects an empty model response", async () => {
    await expect(generateEmbedding("ocean blue", stubAi(undefined))).rejects.toThrow(
      /expected 384 dimensions, got 0/,
    );
  });
});
