import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import Color from "colorjs.io";
import type { HonoEnv } from "../types";

const colorInputSchema = z.object({
  color: z.string().min(1),
});

function toOklch(color: InstanceType<typeof Color>): { l: number; c: number; h: number } {
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

const colorRoutes = new Hono<HonoEnv>().get(
  "/analyze",
  zValidator("query", colorInputSchema),
  (c) => {
    const { color: input } = c.req.valid("query");

    let color: InstanceType<typeof Color>;
    try {
      color = new Color(input);
    } catch {
      return c.json({ error: `Invalid color: ${input}` }, 400);
    }

    const oklch = toOklch(color);
    const hex = color.to("srgb").toString({ format: "hex" });
    const white = new Color("white");
    const black = new Color("black");
    const contrastWhite = contrastRatio(color, white);
    const contrastBlack = contrastRatio(color, black);

    const temperature =
      oklch.h >= 15 && oklch.h < 165
        ? "warm"
        : oklch.h >= 165 && oklch.h < 285
          ? "cool"
          : "neutral";

    return c.json({
      input,
      oklch,
      hex,
      perception: {
        temperature,
        luminanceCategory: oklch.l < 0.35 ? "dark" : oklch.l > 0.75 ? "light" : "mid",
        saturationCategory: oklch.c < 0.04 ? "muted" : oklch.c > 0.15 ? "vivid" : "moderate",
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
  },
);

export { colorRoutes };
