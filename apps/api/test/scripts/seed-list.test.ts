import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { colorKey, parseColorKey } from "../../src/color/key";
import { SEED_CAP, type SeedEntry } from "../../scripts/seed-list";

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(join(import.meta.dirname, "../../seed", name), "utf8"));
}

// The files are written by the build script, which owns their shape.
const entries = readJson("colors.json") as SeedEntry[];
const counts = readJson("counts.json") as {
  total: number;
  sources: Array<{ source: string; license: string; base: number; scale: number }>;
};

const required = [
  "tailwind",
  "material",
  "radix",
  "open-color",
  "primer",
  "carbon",
  "spectrum",
  "fluent",
  "ant",
  "chakra",
  "bootstrap",
  "simple-icons",
  "xkcd",
  "css-named",
  "iscc-nbs",
];

describe("seed list", () => {
  it("holds at most the cap", () => {
    expect(entries.length).toBeLessThanOrEqual(SEED_CAP);
  });

  it("has no duplicate keys", () => {
    expect(new Set(entries.map((e) => e.key)).size).toBe(entries.length);
  });

  it("holds only keys that parse and round-trip through colorKey", () => {
    for (const e of entries) {
      const parsed = parseColorKey(e.key);
      expect(parsed, e.key).not.toBeNull();
      if (parsed) expect(colorKey(parsed)).toBe(e.key);
    }
  });

  it("records a source and a license on every entry", () => {
    for (const e of entries) {
      expect(e.source).toBeTruthy();
      expect(e.license).toBeTruthy();
    }
  });

  it("has entries from every required source", () => {
    const present = new Set(entries.map((e) => e.source));
    for (const id of required) expect(present.has(id), id).toBe(true);
  });

  it("matches the per-source counts file", () => {
    expect(counts.total).toBe(entries.length);
    for (const s of counts.sources) {
      const mine = entries.filter((e) => e.source === s.source);
      expect(mine.filter((e) => e.kind === "base")).toHaveLength(s.base);
      expect(mine.filter((e) => e.kind === "scale")).toHaveLength(s.scale);
      expect(new Set(mine.map((e) => e.license))).toEqual(new Set([s.license]));
    }
  });
});
