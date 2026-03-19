import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";
import Color from "colorjs.io";
import type { Env } from "../app";

const colorInputSchema = z
	.object({
		color: z
			.string()
			.openapi({
				description:
					"Any CSS color string: hex, rgb, hsl, oklch, named color, etc.",
				example: "#3b82f6",
			}),
	})
	.openapi("ColorInput");

const oklchSchema = z
	.object({
		l: z.number().openapi({ description: "Lightness (0-1)" }),
		c: z.number().openapi({ description: "Chroma (0-0.4)" }),
		h: z.number().openapi({ description: "Hue (0-360)" }),
	})
	.openapi("OKLCH");

const contrastSchema = z
	.object({
		white: z.number().openapi({ description: "Contrast ratio against white" }),
		black: z.number().openapi({ description: "Contrast ratio against black" }),
		wcagAANormal: z
			.boolean()
			.openapi({ description: "Passes WCAG AA for normal text (4.5:1)" }),
		wcagAALarge: z
			.boolean()
			.openapi({ description: "Passes WCAG AA for large text (3:1)" }),
		wcagAAA: z
			.boolean()
			.openapi({ description: "Passes WCAG AAA (7:1)" }),
		recommendedForeground: z
			.enum(["white", "black"])
			.openapi({ description: "Better text color for this background" }),
	})
	.openapi("ContrastAnalysis");

const harmonySchema = z
	.object({
		complementary: oklchSchema.openapi({ description: "180 degrees opposite" }),
		analogous: z
			.array(oklchSchema)
			.openapi({ description: "30 degrees each side" }),
		triadic: z.array(oklchSchema).openapi({ description: "120 degree spacing" }),
		splitComplementary: z
			.array(oklchSchema)
			.openapi({ description: "150/210 degree splits" }),
	})
	.openapi("ColorHarmony");

const perceptionSchema = z
	.object({
		temperature: z
			.enum(["cool", "neutral", "warm"])
			.openapi({ description: "Perceptual temperature" }),
		luminanceCategory: z
			.enum(["dark", "mid", "light"])
			.openapi({ description: "Perceptual lightness category" }),
		saturationCategory: z
			.enum(["muted", "moderate", "vivid"])
			.openapi({ description: "Perceptual saturation category" }),
		isNeutral: z
			.boolean()
			.openapi({ description: "Whether the color is near-neutral (low chroma)" }),
	})
	.openapi("PerceptualAnalysis");

const colorAnalysisSchema = z
	.object({
		input: z.string(),
		oklch: oklchSchema,
		hex: z.string(),
		perception: perceptionSchema,
		contrast: contrastSchema,
		harmony: harmonySchema,
	})
	.openapi("ColorAnalysis");

function toOklch(color: InstanceType<typeof Color>): {
	l: number;
	c: number;
	h: number;
} {
	const oklch = color.to("oklch");
	return {
		l: Math.round(oklch.l * 1000) / 1000,
		c: Math.round(oklch.c * 1000) / 1000,
		h: Math.round((oklch.h || 0) * 10) / 10,
	};
}

function harmonyColor(
	base: InstanceType<typeof Color>,
	degrees: number,
): { l: number; c: number; h: number } {
	const oklch = base.to("oklch");
	const shifted = new Color("oklch", [
		oklch.l,
		oklch.c,
		((oklch.h || 0) + degrees) % 360,
	]);
	return toOklch(shifted);
}

function contrastRatio(
	c1: InstanceType<typeof Color>,
	c2: InstanceType<typeof Color>,
): number {
	const l1 = c1.to("srgb").luminance;
	const l2 = c2.to("srgb").luminance;
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);
	return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

const analyzeRoute = createRoute({
	method: "get",
	path: "/v2/color/analyze",
	tags: ["Color Intelligence"],
	summary: "Analyze a color value",
	description:
		"Returns perceptual analysis, accessibility contrast, and harmonic relationships for any CSS color value. All analysis is done in OKLCH perceptual color space.",
	request: {
		query: colorInputSchema,
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: colorAnalysisSchema,
				},
			},
			description: "Color analysis result",
		},
		400: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string() }),
				},
			},
			description: "Invalid color value",
		},
	},
});

export function registerColorRoutes(app: OpenAPIHono<Env>) {
	app.openapi(analyzeRoute, (c) => {
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

		const luminanceCategory =
			oklch.l < 0.35 ? "dark" : oklch.l > 0.75 ? "light" : "mid";

		const saturationCategory =
			oklch.c < 0.04 ? "muted" : oklch.c > 0.15 ? "vivid" : "moderate";

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
				recommendedForeground:
					contrastWhite >= contrastBlack ? "white" : "black",
			},
			harmony: {
				complementary: harmonyColor(color, 180),
				analogous: [harmonyColor(color, -30), harmonyColor(color, 30)],
				triadic: [harmonyColor(color, 120), harmonyColor(color, 240)],
				splitComplementary: [
					harmonyColor(color, 150),
					harmonyColor(color, 210),
				],
			},
		});
	});
}
