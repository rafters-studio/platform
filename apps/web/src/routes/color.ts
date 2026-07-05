import { zValidator } from "@hono/zod-validator";
import { buildColorValue } from "@rafters/color-utils";
import { ColorValueSchema, type ColorValue, type OKLCH } from "@rafters/shared/types";
import { Hono } from "hono";
import { z } from "zod";
import { generateColorIntelligence } from "../lib/color/intelligence";
import {
  buildQueryFilter,
  type ChromaCategory,
  generateColorEmbedding,
  generateQueryEmbedding,
  type HueCategory,
  type LightnessCategory,
  parseVectorMetadata,
  type VectorMetadata,
} from "../lib/color/vector";
import type { ColorSeedMessage } from "../queue/color-consumer";
import type { HonoEnv } from "../types";

const OKLCHParamSchema = z.string().regex(/^\d+\.\d{3}-\d+\.\d{3}-\d+$/, {
  message: "OKLCH path must match L.LLL-C.CCC-H (e.g. 0.500-0.120-240)",
});

const QuerySchema = z.object({
  sync: z.coerce.boolean().default(false),
  adhoc: z.coerce.boolean().default(false),
});

const SearchQuerySchema = z.object({
  q: z.string().min(1),
  hue: z
    .enum(["red", "orange", "yellow", "green", "cyan", "blue", "purple", "magenta", "neutral"])
    .optional(),
  lightness: z.enum(["dark", "mid", "light"]).optional(),
  chroma: z.enum(["neutral", "muted", "saturated", "vivid"]).optional(),
  token: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(10),
});

const ColorResponseSchema = z.object({
  color: ColorValueSchema.nullable(),
  status: z.enum(["found", "approximate", "generating", "queued", "error"]),
  requestId: z.string().optional(),
  error: z.string().optional(),
  similarityScore: z.number().min(0).max(1).optional(),
});

type ColorResponse = z.infer<typeof ColorResponseSchema>;

// Similarity threshold for nearest-neighbor fallback. Color name
// embeddings typically score 0.6-0.7 for similar colors.
const SIMILARITY_THRESHOLD = 0.6;

function parseOklchParam(raw: string): OKLCH {
  const [l, c, h] = raw.split("-").map(Number);
  return { l, c, h, alpha: 1 };
}

// The written equivalence rule (rafters vector.ts buildVectorId):
// 3-decimal L and C, integer hue.
function vectorIdFor(oklch: OKLCH): string {
  return `${oklch.l.toFixed(3)}-${oklch.c.toFixed(3)}-${Math.round(oklch.h)}`;
}

const colorRoutes = new Hono<HonoEnv>()
  .get("/search", zValidator("query", SearchQuerySchema), async (c) => {
    const { q, hue, lightness, chroma, token, limit } = c.req.valid("query");

    const queryEmbedding = await generateQueryEmbedding(q, c.env.AI);

    const filter = buildQueryFilter({
      hue_category: hue as HueCategory | undefined,
      lightness: lightness as LightnessCategory | undefined,
      chroma: chroma as ChromaCategory | undefined,
      token,
    });

    const hasFilter = Object.keys(filter).length > 0;
    const searchResults = await c.env.VECTORIZE.query(queryEmbedding, {
      topK: limit,
      filter: hasFilter ? (filter as Record<string, string | number | boolean>) : undefined,
      returnMetadata: "all",
    });

    const results = searchResults.matches.map((match) => {
      const rawMetadata = match.metadata as unknown as VectorMetadata;
      const parsed = parseVectorMetadata(rawMetadata);
      return {
        color: parsed.color,
        score: match.score,
      };
    });

    return c.json({ results, query: q, total: results.length });
  })
  .get(
    "/:oklch",
    zValidator("param", z.object({ oklch: OKLCHParamSchema })),
    zValidator("query", QuerySchema),
    async (c) => {
      const { oklch: raw } = c.req.valid("param");
      const { sync, adhoc } = c.req.valid("query");
      const oklch = parseOklchParam(raw);

      // Fast path: ad-hoc math-only response (no AI, no vector lookup)
      if (adhoc) {
        const color = buildColorValue(oklch);
        const body: ColorResponse = { color, status: "found" };
        return c.json(body);
      }

      const id = vectorIdFor(oklch);

      // Standard path: exact cache lookup first
      try {
        const results = await c.env.VECTORIZE.getByIds([id]);
        const hit = results?.[0];
        if (hit?.metadata) {
          const parsed = parseVectorMetadata(hit.metadata as unknown as VectorMetadata);
          const body: ColorResponse = { color: parsed.color, status: "found" };
          return c.json(body);
        }
      } catch {
        // Cache miss or error -- fall through to nearest-neighbor
      }

      const math = buildColorValue(oklch);

      // Nearest-neighbor fallback: semantically similar cached color
      try {
        const queryEmbedding = await generateQueryEmbedding(math.name, c.env.AI);
        const similar = await c.env.VECTORIZE.query(queryEmbedding, {
          topK: 1,
          returnMetadata: "all",
        });

        const match = similar.matches[0];
        if (match?.score && match.score > SIMILARITY_THRESHOLD && match.metadata) {
          const parsed = parseVectorMetadata(match.metadata as unknown as VectorMetadata);
          const body: ColorResponse = {
            color: parsed.color,
            status: "approximate",
            similarityScore: match.score,
          };
          return c.json(body);
        }
      } catch {
        // Nearest-neighbor failed -- fall through to generation
      }

      if (!sync) {
        const requestId = crypto.randomUUID();
        try {
          const message: ColorSeedMessage = {
            oklch,
            requestId,
            timestamp: Date.now(),
          };
          await c.env.QUEUE.send(message, { contentType: "json" });
        } catch {
          // Enqueue failure must not fail the read path; the next request
          // for this color re-enqueues. The 202 contract holds either way.
        }
        const body: ColorResponse = { color: math, status: "generating", requestId };
        return c.json(body, 202);
      }

      // Sync mode: generate AI intelligence and store to Vectorize
      let intelligence;
      try {
        intelligence = await generateColorIntelligence(oklch, c.env);
      } catch (err) {
        const message = err instanceof Error ? err.message : "intelligence generation failed";
        // Divergence from the canonical handler (which returns 200 +
        // status:error): the queue consumer acks 200/202 and retries
        // everything else, so a failed generation must not look done.
        const body: ColorResponse = { color: math, status: "error", error: message };
        return c.json(body, 500);
      }

      const enriched: ColorValue = { ...math, intelligence };
      try {
        const { embedding, metadata } = await generateColorEmbedding(enriched, c.env.AI);
        await c.env.VECTORIZE.upsert([
          {
            id,
            values: embedding,
            metadata: metadata as unknown as Record<string, string | number | boolean | string[]>,
          },
        ]);
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
