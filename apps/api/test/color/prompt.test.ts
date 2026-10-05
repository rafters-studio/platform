import { describe, expect, it } from "vite-plus/test";
import { proseProblem, SYSTEM_PROMPT } from "../../src/color/prompt";

describe("SYSTEM_PROMPT", () => {
  it("carries the colorist's writing rules and caps, not its batch procedure", () => {
    expect(SYSTEM_PROMPT).toContain("You are a senior design-systems colorist");
    expect(SYSTEM_PROMPT).toContain("**culturalContext** (at most 40 words)");
    expect(SYSTEM_PROMPT).toContain("**usageGuidance** (at most 35 words)");
    expect(SYSTEM_PROMPT).not.toContain("## How you work a batch");
    expect(SYSTEM_PROMPT).not.toContain("name: colorist");
  });

  it("carries the culture reference as the source for cultural meanings", () => {
    expect(SYSTEM_PROMPT).toContain("# Cross-Cultural Color Reference");
    expect(SYSTEM_PROMPT).toContain("Claims to avoid");
  });
});

describe("proseProblem", () => {
  it("accepts clean text and the P3 gamut name", () => {
    expect(
      proseProblem({ reasoning: "Glows on P3 screens.", usageGuidance: "Hero bands." }),
    ).toBeNull();
  });

  it("rejects a banned word", () => {
    expect(proseProblem({ culturalContext: "Recalls peach skin." })).toBe(
      'culturalContext contains the banned word "skin"',
    );
  });

  it("rejects inflected forms of banned words but not unrelated words", () => {
    expect(proseProblem({ culturalContext: "Like plum skins." })).toContain('"skins"');
    expect(proseProblem({ culturalContext: "A fleshy pink." })).toContain('"fleshy"');
    expect(proseProblem({ culturalContext: "Never gory." })).toContain('"gory"');
    expect(proseProblem({ culturalContext: "Bloodied canvas." })).toContain('"Bloodied"');
    expect(proseProblem({ usageGuidance: "Skinny tags and gorgeous banners." })).toBeNull();
  });

  it("rejects a number", () => {
    expect(proseProblem({ reasoning: "Works in 2026." })).toBe("reasoning contains a number");
  });
});
