import Anthropic from "@anthropic-ai/sdk";
import { calculatePerceptualWeight, getColorTemperature, roundOKLCH } from "@rafters/color-utils";
import type { ColorIntelligence, OKLCH } from "@rafters/shared/types";

const SYSTEM_PROMPT =
  "You are a senior design-systems colorist. You speak the way a knowledgeable design colleague does -- specific, opinionated, useful. You write for designers shipping production interfaces, not academics. You never restate inputs as analysis. You never invent contrast ratios or accessibility math; the platform calculates those separately. You return strict JSON, no prose, no code fences.";

const GATEWAY = "color-vocab";
const BYOK_ALIAS = "colors";
const MODEL = "claude-sonnet-4-5";

function buildPrompt(oklch: OKLCH): string {
  const r = roundOKLCH(oklch);
  const temperature = getColorTemperature(oklch);
  const perceptual = calculatePerceptualWeight(oklch);

  const lightnessBand = r.l < 0.3 ? "dark" : r.l > 0.7 ? "light" : "mid-tone";
  const chromaBand = r.c < 0.05 ? "neutral" : r.c < 0.15 ? "muted" : "saturated";

  return `Color: OKLCH(${r.l}, ${r.c}, ${r.h})
Lightness band: ${lightnessBand}
Chroma band: ${chromaBand}
Temperature: ${temperature}
Perceptual weight: ${perceptual.weight.toFixed(2)} (${perceptual.density})

Return JSON with these exact keys:
{
  "label": "Evocative 1-3 word handle for this color. Designer-facing. Specific to this exact tone -- 'Aged Terracotta' not 'Red', 'Solar Citrine' not 'Yellow'. No generic hue words.",
  "reasoning": "Why this exact OKLCH coordinate works as a deliberate design choice. Reference L, C, H. One or two sentences.",
  "emotionalImpact": "What this color does to the viewer. Specific to this lightness/chroma/hue, not the hue family in general.",
  "culturalContext": "Cross-cultural associations grounded in this exact tone. Avoid stock symbolism if the chroma or lightness changes the read.",
  "accessibilityNotes": "What designers should watch for at this lightness band. No invented contrast ratios.",
  "usageGuidance": "Concrete UI use cases that fit this chroma/lightness combination. Name surfaces.",
  "balancingGuidance": "How to balance this color given its ${perceptual.density} perceptual weight. Area ratios, pairing strategies."
}`;
}

export async function generateColorIntelligence(
  oklch: OKLCH,
  env: Pick<Env, "CF_API_KEY" | "CF_WORKER_AI_KEY">,
): Promise<ColorIntelligence> {
  const anthropic = new Anthropic({
    apiKey: env.CF_WORKER_AI_KEY,
    baseURL: `https://gateway.ai.cloudflare.com/v1/${env.CF_API_KEY}/${GATEWAY}/anthropic`,
    defaultHeaders: {
      "cf-aig-byok-alias": BYOK_ALIAS,
      "cf-aig-cache-ttl": "86400",
    },
  });

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0.7,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(oklch) }],
  });

  const block = message.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error(`Anthropic returned no text block: ${JSON.stringify(message).slice(0, 200)}`);
  }

  const fenced = block.text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const json = fenced ? fenced[1].trim() : block.text.trim();

  let parsed: Partial<ColorIntelligence> & { label?: string };
  try {
    parsed = JSON.parse(json) as Partial<ColorIntelligence> & { label?: string };
  } catch (err) {
    throw new Error(
      `Sonnet returned non-JSON: ${json.slice(0, 200)} (${err instanceof Error ? err.message : "unknown"})`,
    );
  }

  if (!parsed.label) {
    throw new Error(`Sonnet returned no label field in: ${JSON.stringify(parsed).slice(0, 200)}`);
  }

  return {
    label: parsed.label,
    reasoning: parsed.reasoning ?? "",
    emotionalImpact: parsed.emotionalImpact ?? "",
    culturalContext: parsed.culturalContext ?? "",
    accessibilityNotes: parsed.accessibilityNotes ?? "",
    usageGuidance: parsed.usageGuidance ?? "",
    ...(parsed.balancingGuidance && { balancingGuidance: parsed.balancingGuidance }),
  } as ColorIntelligence;
}
