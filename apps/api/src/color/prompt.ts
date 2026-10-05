import colorist from "../../../../.claude/agents/colorist.md";
import cultureReference from "../../../../docs/color-culture-reference.md";

// The colorist agent definition is the single source for how colors are
// written, both for the local seed and for the worker. The worker takes the
// writing rules (from "How you write each color" up to "How you work a batch")
// and adds the culture reference, the only source for cultural meanings.
function writingRules(definition: string): string {
  const start = definition.indexOf("## How you write each color");
  const end = definition.indexOf("## How you work a batch");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("colorist.md is missing its writing-rules sections");
  }
  return definition.slice(start, end).trim();
}

// The opening paragraph after the frontmatter: who the colorist is.
function persona(definition: string): string {
  const body = definition.replace(/^---[\s\S]*?---\s*/, "");
  return body.slice(0, body.indexOf("##")).trim();
}

export const SYSTEM_PROMPT = `${persona(colorist)}

You are given one color. Write it following these rules.

${writingRules(colorist)}

## Culture reference

The reference below is the only source for culturalContext and for regional conflicts in usageGuidance. Respect its confidence levels, its "do not infer" notes, and its "Claims to avoid" list.

${cultureReference}`;

export const LABEL_RULES = `Label candidates: exactly three, ranked best first. Each is one to three real words pairing a color anchor (a real thing this tone is like) with one evocative word, the kind a designer would put in Figma ("Aged Terracotta", not "Red"). Prefer the specific and unexpected over the common. Do not reuse or closely echo a label from the nearby list. Never put a nationality or region in a label.`;

const BANNED_PROSE =
  /\b(skin|flesh|complexion|blood|bloody|oxblood|gore|corpse|injur\w*|bruis\w*)\b/i;

// Returns why generated text breaks a writing rule, or null when it is clean.
export function proseProblem(fields: Record<string, string>): string | null {
  for (const [name, text] of Object.entries(fields)) {
    const banned = BANNED_PROSE.exec(text);
    if (banned) return `${name} contains the banned word "${banned[0]}"`;
    if (/\d/.test(text.replaceAll("P3", ""))) return `${name} contains a number`;
  }
  return null;
}
