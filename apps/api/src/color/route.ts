import Anthropic from "@anthropic-ai/sdk";
import { zValidator } from "@hono/zod-validator";
import { buildColorValue } from "@rafters/color-utils";
import { type ColorIntelligence, ColorIntelligenceSchema, type ColorValue } from "@rafters/shared";
import { Hono } from "hono";
import { z } from "zod";
import {
  findExact,
  findNearest,
  isLabelConflict,
  labelTaken,
  nearbyLabels,
  type IntelligenceText,
  store,
} from "./cache";
import { createGatewayClient } from "./gateway";
import {
  generateIntelligence,
  generateLabelCandidates,
  INTELLIGENCE_MODEL,
  type RejectedLabel,
} from "./intelligence";
import { screenLabels } from "./labels";
import { COLOR_KEY_PATTERN, colorKey, parseColorKey } from "./key";
import { type OKLab, toOKLab } from "./oklab";

export interface ColorResponse {
  color: ColorValue;
  status: "found" | "approximate" | "error";
  source: "cache" | "generated";
  nearest?: { key: string; deltaE: number };
  error?: string;
}

const BUSY_MESSAGE = "Color intelligence is busy; try again in a minute";

const ParamSchema = z.object({
  oklch: z.string().regex(COLOR_KEY_PATTERN, {
    message: "Color must be L.LLL-C.CCC-H, e.g. 0.500-0.120-240, with H from 0 to 359",
  }),
});

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "Color intelligence generation failed";
}

// Candidates that pass the banned-term check and are not already in use.
async function usableLabels(
  db: D1Database,
  candidates: readonly string[],
  rejected: RejectedLabel[],
): Promise<string[]> {
  const screened = screenLabels(candidates);
  rejected.push(...screened.rejected);
  const usable: string[] = [];
  for (const label of screened.passing) {
    if (await labelTaken(db, label)) rejected.push({ label, reason: "already used" });
    else usable.push(label);
  }
  return usable;
}

// Stores the color with the first candidate the unique index accepts, or with
// a NULL label when none is left. Returns the label that was stored.
async function storeWithLabel(
  db: D1Database,
  key: string,
  lab: OKLab,
  text: IntelligenceText,
  labels: readonly string[],
): Promise<string | null> {
  const base = { key, lab, text, model: INTELLIGENCE_MODEL };
  for (const label of labels) {
    try {
      await store(db, { ...base, label });
      return label;
    } catch (error) {
      // A concurrent request took this label; try the next candidate.
      if (!isLabelConflict(error)) throw error;
    }
  }
  await store(db, { ...base, label: null });
  return null;
}

export const colorRoutes = new Hono<{ Bindings: Env }>().get(
  "/:oklch",
  zValidator("param", ParamSchema, (result, c) => {
    if (!result.success) return c.json({ error: result.error.issues[0]?.message }, 400);
  }),
  async (c) => {
    const oklch = parseColorKey(c.req.valid("param").oklch);
    if (!oklch) {
      return c.json({ error: "Hue must be from 0 to 359" }, 400);
    }
    const db = c.env.rafters_platform;
    const key = colorKey(oklch);
    const lab = toOKLab(oklch);
    const color = buildColorValue(oklch);

    const exact = await findExact(db, key);
    if (exact) {
      return c.json<ColorResponse>({
        color: { ...color, intelligence: exact },
        status: "found",
        source: "cache",
      });
    }

    const near = await findNearest(db, lab);
    if (near) {
      return c.json<ColorResponse>({
        color: { ...color, intelligence: near.intelligence },
        status: "approximate",
        source: "cache",
        nearest: { key: near.key, deltaE: near.deltaE },
      });
    }

    let intelligence: ColorIntelligence;
    try {
      const client = createGatewayClient(c.env);
      const neighbors = await nearbyLabels(db, lab);
      const generated = await generateIntelligence(client, oklch, color, neighbors);

      const rejected: RejectedLabel[] = [];
      let usable = await usableLabels(db, generated.candidates, rejected);
      if (usable.length === 0) {
        try {
          const retry = await generateLabelCandidates(client, oklch, color, neighbors, rejected);
          usable = await usableLabels(db, retry, rejected);
        } catch (error) {
          console.error(`color label retry failed for ${key}: ${describeError(error)}`);
        }
      }
      if (usable.length === 0) {
        console.error(
          `no usable label for ${key}; rejected: ${rejected.map((r) => `${r.label} (${r.reason})`).join("; ")}`,
        );
      }

      let label: string | null = usable[0] ?? null;
      try {
        label = await storeWithLabel(db, key, lab, generated.text, usable);
      } catch (error) {
        // A failed write costs a regeneration next time, not this response.
        console.error(`color cache write failed for ${key}: ${describeError(error)}`);
      }
      intelligence = ColorIntelligenceSchema.parse({
        ...generated.text,
        ...(label === null ? {} : { label }),
      });
    } catch (error) {
      const message =
        error instanceof Anthropic.RateLimitError ? BUSY_MESSAGE : describeError(error);
      console.error(`color intelligence failed for ${key}: ${describeError(error)}`);
      return c.json<ColorResponse>({ color, status: "error", source: "generated", error: message });
    }

    return c.json<ColorResponse>({
      color: { ...color, intelligence },
      status: "found",
      source: "generated",
    });
  },
);
