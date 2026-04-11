import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { HonoEnv } from "../types";
import Color from "colorjs.io";

const colorInputSchema = z.object({
  color: z.string(),
});

const oklchSchema = z.object({
  l: z.number(),
  c: z.number(),
  h: z.number(),
});

const contrastSchema = z.object({
  white: z.number(),
  black: z.number(),
  wcagAANormal: z.boolean(),
  wcagAALarge: z.boolean(),
  wcagAAA: z.boolean(),
  recommendedForeground: z.enum(["white", "black"]),
});

const harmonySchema = z.object({
  complementary: oklchSchema,
  analogous: z.array(oklchSchema),
  triadic: z.array(oklchSchema),
  splitComplementary: z.array(oklchSchema),
});

const perceptionSchema = z.object({
  temperature: z.enum(["cool", "neutral", "warm"]),
  luminanceCategory: z.enum(["dark", "mid", "light"]),
  saturationCategory: z.enum(["muted", "moderate", "vivid"]),
  isNeutral: z.boolean(),
});

const WHITE = new Color("white");
const BLACK = new Color("black");

function toOklch(color: InstanceType<typeof Color>): {
  l: number;
  c: number;
  h: number;
} {
  const oklch = color.to("oklch");
  return {
    l: Math.round((oklch.l ?? 0) * 1000) / 1000,
    c: Math.round((oklch.c ?? 0) * 1000) / 1000,
    h: Math.round((oklch.h || 0) * 10) / 10,
  };
}

function harmonyColor(
  base: InstanceType<typeof Color>,
  degrees: number,
): { l: number; c: number; h: number } {
  const oklch = base.to("oklch");
  const shifted = new Color("oklch", [oklch.l, oklch.c, ((oklch.h || 0) + degrees) % 360]);
  return toOklch(shifted);
}

function contrastRatio(c1: InstanceType<typeof Color>, c2: InstanceType<typeof Color>): number {
  const l1 = c1.to("srgb").luminance;
  const l2 = c2.to("srgb").luminance;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

export function registerColorRoutes(app: Hono<HonoEnv>) {
  app.get("/v2/color/analyze", zValidator("query", colorInputSchema), (c) => {
    const { color: input } = c.req.valid("query");

    let color: InstanceType<typeof Color>;
    try {
      color = new Color(input);
    } catch {
      return c.json({ error: `Invalid color: ${input}` }, 400);
    }

    const oklch = toOklch(color);
    const hex = color.to("srgb").toString({ format: "hex" });

    const contrastWhite = contrastRatio(color, WHITE);
    const contrastBlack = contrastRatio(color, BLACK);

    const temperature =
      oklch.h >= 15 && oklch.h < 165
        ? "warm"
        : oklch.h >= 165 && oklch.h < 285
          ? "cool"
          : "neutral";

    const luminanceCategory = oklch.l < 0.35 ? "dark" : oklch.l > 0.75 ? "light" : "mid";

    const saturationCategory = oklch.c < 0.04 ? "muted" : oklch.c > 0.15 ? "vivid" : "moderate";

    return c.json({
      input,
      oklch,
      hex,
      perception: {
        temperature,
        luminanceCategory,
        saturationCategory,
        isNeutral: oklch.c < 0.02,
      },
      contrast: {
        white: contrastWhite,
        black: contrastBlack,
        wcagAANormal: Math.max(contrastWhite, contrastBlack) >= 4.5,
        wcagAALarge: Math.max(contrastWhite, contrastBlack) >= 3,
        wcagAAA: Math.max(contrastWhite, contrastBlack) >= 7,
        recommendedForeground: contrastWhite >= contrastBlack ? "white" : "black",
      },
      harmony: {
        complementary: harmonyColor(color, 180),
        analogous: [harmonyColor(color, -30), harmonyColor(color, 30)],
        triadic: [harmonyColor(color, 120), harmonyColor(color, 240)],
        splitComplementary: [harmonyColor(color, 150), harmonyColor(color, 210)],
      },
    });
  });
}
