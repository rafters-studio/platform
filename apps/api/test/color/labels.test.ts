import { describe, expect, it } from "vite-plus/test";
import { bannedTermIn } from "../../src/color/banned-label-terms";
import { screenLabels } from "../../src/color/labels";

describe("bannedTermIn", () => {
  it("finds a banned word in any case", () => {
    expect(bannedTermIn("Bloody ROSE")).toBe("bloody");
  });

  it("returns null for a clean label", () => {
    expect(bannedTermIn("Aged Terracotta")).toBeNull();
  });

  it("matches whole words, not substrings", () => {
    expect(bannedTermIn("Warm Sand")).toBeNull();
    expect(bannedTermIn("Warden Green")).toBeNull();
  });
});

describe("screenLabels", () => {
  it("keeps rank order and gives a reason for each rejection", () => {
    const { passing, rejected } = screenLabels(["War Paint", "Dusk Rose", "Skin Tone"]);
    expect(passing).toEqual(["Dusk Rose"]);
    expect(rejected.map((r) => r.label)).toEqual(["War Paint", "Skin Tone"]);
    expect(rejected[0]?.reason).toContain("war");
  });
});

describe("bannedTermIn word splitting", () => {
  it("catches banned words joined by hyphens", () => {
    expect(bannedTermIn("Skin-Tone")).toBe("skin");
    expect(bannedTermIn("Gun-Metal Blue")).toBe("gun");
  });

  it("catches a hyphenated term written with a space or a hyphen", () => {
    expect(bannedTermIn("Coca-Cola Red")).toBe("coca cola");
    expect(bannedTermIn("Coca Cola Red")).toBe("coca cola");
  });

  it("allows plain color words and established color names", () => {
    expect(bannedTermIn("Warm Brown")).toBeNull();
    expect(bannedTermIn("Soft Black")).toBeNull();
    expect(bannedTermIn("Apple Green")).toBeNull();
  });
});

describe("bannedTermIn blood and bruise", () => {
  it("bans blood and bruise, including Blood Orange", () => {
    expect(bannedTermIn("Blood Orange")).toBe("blood");
    expect(bannedTermIn("Dried Blood Velvet")).toBe("blood");
    expect(bannedTermIn("Bruised Ruby")).toBe("bruised");
    expect(bannedTermIn("Bruise Purple")).toBe("bruise");
  });
});
