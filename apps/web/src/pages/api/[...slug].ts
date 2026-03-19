import type { APIRoute } from "astro";
import { Hono } from "hono";

export const prerender = false;

const app = new Hono();

app.get("/api/health", (c) => c.json({ status: "ok" }));
app.get("/api/v2/color/analyze", async (c) => {
	const { default: Color } = await import("colorjs.io");
	const input = c.req.query("color");
	if (!input) return c.json({ error: "color parameter required" }, 400);

	let color: InstanceType<typeof Color>;
	try {
		color = new Color(input);
	} catch {
		return c.json({ error: `Invalid color: ${input}` }, 400);
	}

	const oklch = color.to("oklch");
	const l = Math.round(oklch.l * 1000) / 1000;
	const ch = Math.round(oklch.c * 1000) / 1000;
	const h = Math.round((oklch.h || 0) * 10) / 10;
	const hex = color.to("srgb").toString({ format: "hex" });

	const white = new Color("white");
	const black = new Color("black");
	const lum1w = color.to("srgb").luminance;
	const lum2w = white.to("srgb").luminance;
	const contrastWhite = Math.round(((Math.max(lum1w, lum2w) + 0.05) / (Math.min(lum1w, lum2w) + 0.05)) * 100) / 100;
	const lum2b = black.to("srgb").luminance;
	const contrastBlack = Math.round(((Math.max(lum1w, lum2b) + 0.05) / (Math.min(lum1w, lum2b) + 0.05)) * 100) / 100;

	const temperature = h >= 15 && h < 165 ? "warm" : h >= 165 && h < 285 ? "cool" : "neutral";
	const luminanceCategory = l < 0.35 ? "dark" : l > 0.75 ? "light" : "mid";
	const saturationCategory = ch < 0.04 ? "muted" : ch > 0.15 ? "vivid" : "moderate";

	function harmonyColor(degrees: number) {
		const shifted = new Color("oklch", [oklch.l, oklch.c, ((oklch.h || 0) + degrees) % 360]);
		const so = shifted.to("oklch");
		return { l: Math.round(so.l * 1000) / 1000, c: Math.round(so.c * 1000) / 1000, h: Math.round((so.h || 0) * 10) / 10 };
	}

	return c.json({
		input,
		oklch: { l, c: ch, h },
		hex,
		perception: {
			temperature,
			luminanceCategory,
			saturationCategory,
			isNeutral: ch < 0.02,
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
			complementary: harmonyColor(180),
			analogous: [harmonyColor(-30), harmonyColor(30)],
			triadic: [harmonyColor(120), harmonyColor(240)],
			splitComplementary: [harmonyColor(150), harmonyColor(210)],
		},
	});
});

const handler: APIRoute = (context) => {
	return app.fetch(context.request);
};

export const GET = handler;
export const POST = handler;
