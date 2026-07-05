// Faithful port of the written rule: rafters/apps/api/src/lib/color/vector.ts.
// Semantic text embeddings via Workers AI bge-small-en-v1.5 (384 dims) over
// the color's name + intelligence prose; category metadata for filtered
// search; color_json carries the full ColorValue (Vectorize metadata is
// primitives-only). Rafters owns these decisions -- port, never redesign.

import type { ColorValue, OKLCH } from "@rafters/shared/types";

// bge-small-en-v1.5 produces 384 dimensions
export const VECTORIZE_DIMENSIONS = 384;

export type HueCategory =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "cyan"
  | "blue"
  | "purple"
  | "magenta"
  | "neutral";

export function getHueCategory(hue: number, chroma: number): HueCategory {
  // Neutral/achromatic colors have very low chroma
  if (chroma < 0.02) return "neutral";

  if (hue >= 345 || hue < 15) return "red";
  if (hue >= 15 && hue < 45) return "orange";
  if (hue >= 45 && hue < 75) return "yellow";
  if (hue >= 75 && hue < 165) return "green";
  if (hue >= 165 && hue < 195) return "cyan";
  if (hue >= 195 && hue < 270) return "blue";
  if (hue >= 270 && hue < 315) return "purple";
  return "magenta"; // 315-345
}

export type LightnessCategory = "dark" | "mid" | "light";

export function getLightnessCategory(lightness: number): LightnessCategory {
  if (lightness < 0.35) return "dark";
  if (lightness > 0.65) return "light";
  return "mid";
}

export type ChromaCategory = "neutral" | "muted" | "saturated" | "vivid";

export function getChromaCategory(chroma: number): ChromaCategory {
  if (chroma < 0.02) return "neutral";
  if (chroma < 0.08) return "muted";
  if (chroma < 0.18) return "saturated";
  return "vivid";
}

// Vectorize metadata is primitives-only, so the ColorValue rides as JSON.
export interface VectorMetadata {
  hue_category: HueCategory;
  lightness: LightnessCategory;
  chroma: ChromaCategory;
  token?: string;
  color_json: string;
}

export interface ParsedVectorMetadata {
  hue_category: HueCategory;
  lightness: LightnessCategory;
  chroma: ChromaCategory;
  token?: string;
  color: ColorValue;
}

export function parseVectorMetadata(metadata: VectorMetadata): ParsedVectorMetadata {
  return {
    hue_category: metadata.hue_category,
    lightness: metadata.lightness,
    chroma: metadata.chroma,
    token: metadata.token,
    color: JSON.parse(metadata.color_json) as ColorValue,
  };
}

export function buildVectorMetadata(color: ColorValue): VectorMetadata {
  // Base color is scale[5] (the 500 step) or first available
  const baseColor: OKLCH = color.scale[5] ?? color.scale[0] ?? { l: 0.5, c: 0, h: 0, alpha: 1 };

  return {
    hue_category: getHueCategory(baseColor.h, baseColor.c),
    lightness: getLightnessCategory(baseColor.l),
    chroma: getChromaCategory(baseColor.c),
    token: color.token,
    color_json: JSON.stringify(color),
  };
}

// Deterministic name leads (twice, for emphasis) so searches like
// "ocean blue" match; intelligence prose carries the semantic weight.
export function buildEmbeddingText(color: ColorValue): string {
  const parts: string[] = [];

  if (color.name) {
    parts.push(color.name);
    parts.push(color.name);
  }

  if (color.intelligence) {
    parts.push(color.intelligence.emotionalImpact);
    parts.push(color.intelligence.reasoning);
    parts.push(color.intelligence.culturalContext);
    if (color.intelligence.usageGuidance) {
      parts.push(color.intelligence.usageGuidance);
    }
  }

  if (color.token) {
    parts.push(`semantic role: ${color.token}`);
  }

  if (color.analysis) {
    parts.push(`${color.analysis.temperature} ${color.analysis.name}`);
  }

  return parts.filter(Boolean).join(". ");
}

interface EmbeddingResponse {
  shape?: number[];
  data?: number[][];
  pooling?: string;
}

export async function generateEmbedding(text: string, aiBinding: Ai): Promise<number[]> {
  const response = (await aiBinding.run("@cf/baai/bge-small-en-v1.5", {
    text: [text],
  })) as EmbeddingResponse;

  const embedding = response.data?.[0];

  if (!embedding || embedding.length !== VECTORIZE_DIMENSIONS) {
    throw new Error(
      `Invalid embedding response: expected ${VECTORIZE_DIMENSIONS} dimensions, got ${embedding?.length ?? 0}`,
    );
  }

  return embedding;
}

export async function generateColorEmbedding(
  color: ColorValue,
  aiBinding: Ai,
): Promise<{ embedding: number[]; metadata: VectorMetadata }> {
  const text = buildEmbeddingText(color);
  const embedding = await generateEmbedding(text, aiBinding);
  const metadata = buildVectorMetadata(color);

  return { embedding, metadata };
}

export async function generateQueryEmbedding(query: string, aiBinding: Ai): Promise<number[]> {
  return generateEmbedding(query, aiBinding);
}

export interface ColorQueryFilter {
  hue_category?: HueCategory | HueCategory[];
  lightness?: LightnessCategory | LightnessCategory[];
  chroma?: ChromaCategory | ChromaCategory[];
  token?: string;
}

export function buildQueryFilter(filter: ColorQueryFilter): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (filter.hue_category) {
    result.hue_category = Array.isArray(filter.hue_category)
      ? { $in: filter.hue_category }
      : filter.hue_category;
  }

  if (filter.lightness) {
    result.lightness = Array.isArray(filter.lightness)
      ? { $in: filter.lightness }
      : filter.lightness;
  }

  if (filter.chroma) {
    result.chroma = Array.isArray(filter.chroma) ? { $in: filter.chroma } : filter.chroma;
  }

  if (filter.token) {
    result.token = filter.token;
  }

  return result;
}
