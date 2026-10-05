import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getGamutTier } from "@rafters/color-utils";
import { ColorIntelligenceSchema, type ColorValue, type OKLCH } from "@rafters/shared";
import { z } from "zod";
import type { IntelligenceText } from "./cache";
import { LABEL_RULES, proseProblem, SYSTEM_PROMPT } from "./prompt";

export const INTELLIGENCE_MODEL = "claude-sonnet-5-5";

// Thinking and output share this budget.
const MAX_TOKENS = 16000;

const LabelCandidatesSchema = z.object({
  labelCandidates: z.array(z.string()),
});

const GeneratedSchema = LabelCandidatesSchema.extend({
  reasoning: z.string().min(1),
  emotionalImpact: z.string().min(1),
  culturalContext: z.string().min(1),
  accessibilityNotes: z.string().min(1),
  usageGuidance: z.string().min(1),
  balancingGuidance: z.string().min(1),
});

export interface RejectedLabel {
  label: string;
  reason: string;
}

export interface GeneratedIntelligence {
  text: IntelligenceText;
  candidates: string[];
}

function describeColor(oklch: OKLCH, color: ColorValue, neighbors: readonly string[]): string {
  const lines = [
    `OKLCH: L ${oklch.l.toFixed(3)}, C ${oklch.c.toFixed(3)}, H ${Math.round(oklch.h)}`,
    `Gamut: ${getGamutTier(oklch)}`,
  ];
  if (color.analysis) {
    lines.push(`Temperature: ${color.analysis.temperature}`);
    lines.push(`Reads as: ${color.analysis.isLight ? "light" : "dark"}`);
  }
  if (color.perceptualWeight) {
    lines.push(`Perceptual weight density: ${color.perceptualWeight.density}`);
  }
  lines.push(
    neighbors.length > 0
      ? `Labels already used by nearby colors: ${neighbors.join(", ")}`
      : "No nearby colors have labels yet.",
  );
  return lines.join("\n");
}

// One structured request. stop_reason is read before the output is parsed so a
// cut-off or refused reply is reported as that, not as a parse failure.
async function requestStructured<S extends z.ZodType>(
  client: Anthropic,
  schema: S,
  system: string,
  user: string,
  cacheSystem: boolean,
): Promise<z.infer<S>> {
  const response = await client.messages.create({
    model: INTELLIGENCE_MODEL,
    max_tokens: MAX_TOKENS,
    output_config: { effort: "medium", format: zodOutputFormat(schema) },
    // The main prompt carries the culture reference, so it is cached across misses.
    system: cacheSystem
      ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }]
      : system,
    messages: [{ role: "user", content: user }],
  });

  if (response.stop_reason === "max_tokens") {
    throw new Error("Color intelligence response was cut off");
  }
  if (response.stop_reason === "refusal") {
    throw new Error("Color intelligence request was refused");
  }
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Color intelligence response had no text");
  }
  let json: unknown;
  try {
    json = JSON.parse(block.text);
  } catch {
    throw new Error("Color intelligence response was not valid JSON");
  }
  return schema.parse(json);
}

// Generates the six text fields and three ranked label candidates for one
// color. Throws on an API error, a cut-off or refused reply, or output that
// fails validation; the caller decides what to return.
export async function generateIntelligence(
  client: Anthropic,
  oklch: OKLCH,
  color: ColorValue,
  neighbors: readonly string[],
): Promise<GeneratedIntelligence> {
  const { labelCandidates, ...text } = await requestStructured(
    client,
    GeneratedSchema,
    SYSTEM_PROMPT,
    describeColor(oklch, color, neighbors),
    true,
  );
  const problem = proseProblem(text);
  if (problem) throw new Error(`Color intelligence broke a writing rule: ${problem}`);
  ColorIntelligenceSchema.parse(text);
  return { text, candidates: labelCandidates };
}

// Asks again for label candidates only, after every earlier candidate failed.
export async function generateLabelCandidates(
  client: Anthropic,
  oklch: OKLCH,
  color: ColorValue,
  neighbors: readonly string[],
  rejected: readonly RejectedLabel[],
): Promise<string[]> {
  const system = `You name colors for a design system. ${LABEL_RULES} Never state numbers.`;
  const user = `${describeColor(oklch, color, neighbors)}
Earlier candidates were rejected:
${rejected.map((r) => `- ${r.label}: ${r.reason}`).join("\n")}
Write three new label candidates.`;
  const { labelCandidates } = await requestStructured(
    client,
    LabelCandidatesSchema,
    system,
    user,
    false,
  );
  return labelCandidates;
}
