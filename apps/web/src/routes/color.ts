import { zValidator } from "@hono/zod-validator";
import { buildColorValue } from "@rafters/color-utils";
import { ColorValueSchema, type ColorValue, type OKLCH } from "@rafters/shared/types";
import { Hono } from "hono";
import { z } from "zod";
import { generateColorIntelligence } from "../lib/color/intelligence";
import type { ColorSeedMessage } from "../queue/color-consumer";
import type { HonoEnv } from "../types";

const OKLCHParamSchema = z.string().regex(/^\d+\.\d{3}-\d+\.\d{3}-\d+$/, {
  message: "OKLCH path must match L.LLL-C.CCC-H (e.g. 0.500-0.120-240)",
});

const QuerySchema = z.object({
  sync: z.coerce.boolean().default(false),
  adhoc: z.coerce.boolean().default(false),
});

const ColorResponseSchema = z.object({
  color: ColorValueSchema.nullable(),
  status: z.enum(["found", "approximate", "generating", "queued", "error"]),
  requestId: z.string().optional(),
  error: z.string().optional(),
  similarityScore: z.number().min(0).max(1).optional(),
});

type ColorResponse = z.infer<typeof ColorResponseSchema>;

function parseOklchParam(raw: string): OKLCH {
  const [l, c, h] = raw.split("-").map(Number);
  return { l, c, h, alpha: 1 };
}

function vectorIdFor(oklch: OKLCH): string {
  return `${oklch.l.toFixed(3)}-${oklch.c.toFixed(3)}-${Math.round(oklch.h)}`;
}

async function lookupExact(vectorize: VectorizeIndex, id: string): Promise<ColorValue | null> {
  const matches = await vectorize.getByIds([id]);
  const hit = matches?.[0];
  if (!hit?.metadata?.color_json) return null;
  return JSON.parse(String(hit.metadata.color_json)) as ColorValue;
}

async function persist(vectorize: VectorizeIndex, id: string, color: ColorValue): Promise<void> {
  await vectorize.upsert([
    {
      id,
      values: analyticalVector(color),
      metadata: {
        color_json: JSON.stringify(color),
        l: color.scale[5]?.l ?? 0.5,
        c: color.scale[5]?.c ?? 0,
        h: color.scale[5]?.h ?? 0,
      },
    },
  ]);
}

const VECTOR_DIMENSIONS = 384;

function analyticalVector(color: ColorValue): number[] {
  const base = color.scale[5] ?? { l: 0.5, c: 0, h: 0, alpha: 1 };
  const hueRad = (base.h * Math.PI) / 180;
  const features = [
    base.l,
    base.c,
    Math.sin(hueRad),
    Math.cos(hueRad),
    color.perceptualWeight?.weight ?? 0.5,
    color.analysis?.temperature === "warm" ? 1 : color.analysis?.temperature === "cool" ? -1 : 0,
  ];
  return [...features, ...new Array<number>(VECTOR_DIMENSIONS - features.length).fill(0)];
}

const colorRoutes = new Hono<HonoEnv>().get(
  "/:oklch",
  zValidator("param", z.object({ oklch: OKLCHParamSchema })),
  zValidator("query", QuerySchema),
  async (c) => {
    const { oklch: raw } = c.req.valid("param");
    const { sync, adhoc } = c.req.valid("query");
    const oklch = parseOklchParam(raw);

    if (adhoc) {
      const color = buildColorValue(oklch);
      const body: ColorResponse = { color, status: "found" };
      return c.json(body);
    }

    const id = vectorIdFor(oklch);
    const cached = await lookupExact(c.env.VECTORIZE, id);
    if (cached) {
      const body: ColorResponse = { color: cached, status: "found" };
      return c.json(body);
    }

    const math = buildColorValue(oklch);

    if (!sync) {
      try {
        const message: ColorSeedMessage = {
          oklch,
          requestId: crypto.randomUUID(),
          timestamp: Date.now(),
        };
        await c.env.QUEUE.send(message, { contentType: "json" });
      } catch {
        // Enqueue failure must not fail the read path; the next request
        // for this color re-enqueues. The 202 contract holds either way.
      }
      const body: ColorResponse = { color: math, status: "generating" };
      return c.json(body, 202);
    }

    let intelligence;
    try {
      intelligence = await generateColorIntelligence(oklch, c.env);
    } catch (err) {
      const message = err instanceof Error ? err.message : "intelligence generation failed";
      const body: ColorResponse = { color: math, status: "error", error: message };
      return c.json(body, 500);
    }

    const enriched: ColorValue = { ...math, intelligence };
    try {
      await persist(c.env.VECTORIZE, id, enriched);
    } catch (err) {
      console.warn(
        `Vectorize persist failed for ${id}: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }

    const body: ColorResponse = { color: enriched, status: "found" };
    return c.json(body);
  },
);

export { colorRoutes };
