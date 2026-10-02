// Builds apps/api/seed/colors.json and apps/api/seed/counts.json: the colors
// designers start from, keyed with the same colorKey the color API uses.
//
//   pnpm --filter @platform/api run seed:build
//
// Every source is read from a pinned devDependency (see pnpm-workspace.yaml),
// so the list is reproducible from the lockfile.
import { buildColorValue, hexToOKLCH } from "@rafters/color-utils";
import type { OKLCH } from "@rafters/shared";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { colorKey } from "../src/color/key";
import { SEED_CAP, type SeedEntry, type SourceCount } from "./seed-list";

const here = dirname(fileURLToPath(import.meta.url));
const apiDir = join(here, "..");
const seedDir = join(apiDir, "seed");

interface RawColor {
  oklch: OKLCH;
  label: string;
}

interface Source {
  id: string;
  name: string;
  license: string;
  // Package the data was read from, for the version record.
  pkg: string;
  read: () => Promise<RawColor[]>;
}

function pkgPath(pkg: string, ...rest: string[]): string {
  return join(apiDir, "node_modules", pkg, ...rest);
}

function pkgVersion(pkg: string): string {
  const raw: unknown = JSON.parse(readFileSync(pkgPath(pkg, "package.json"), "utf8"));
  if (
    typeof raw === "object" &&
    raw !== null &&
    "version" in raw &&
    typeof raw.version === "string"
  ) {
    return raw.version;
  }
  throw new Error(`no version in ${pkg}/package.json`);
}

function text(pkg: string, ...rest: string[]): string {
  return readFileSync(pkgPath(pkg, ...rest), "utf8");
}

function json(pkg: string, ...rest: string[]): unknown {
  return JSON.parse(text(pkg, ...rest));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function hexOf(label: string, hex: string): RawColor {
  const clean = hex.startsWith("#") ? hex : `#${hex}`;
  return { oklch: hexToOKLCH(clean), label };
}

// Every 6- or 3-digit hex literal in a text, labelled by the file and index.
function hexesIn(src: string, prefix: string): RawColor[] {
  const out: RawColor[] = [];
  for (const m of src.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g)) {
    out.push(hexOf(`${prefix} ${m[0].toLowerCase()}`, m[0]));
  }
  return out;
}

// "name: #hex" declarations, labelled by the declared name.
function declaredHexes(src: string, pattern: RegExp): RawColor[] {
  const out: RawColor[] = [];
  for (const m of src.matchAll(pattern)) {
    const [, name, hex] = m;
    if (name !== undefined && hex !== undefined) out.push(hexOf(name, hex));
  }
  return out;
}

function walkStrings(value: unknown, path: string, visit: (path: string, s: string) => void): void {
  if (typeof value === "string") visit(path, value);
  else if (Array.isArray(value)) value.forEach((v, i) => walkStrings(v, `${path}-${i + 1}`, visit));
  else if (isRecord(value)) {
    for (const [k, v] of Object.entries(value)) walkStrings(v, path ? `${path}-${k}` : k, visit);
  }
}

function hexLeaves(value: unknown): RawColor[] {
  const out: RawColor[] = [];
  walkStrings(value, "", (path, s) => {
    if (/^#[0-9a-fA-F]{6}$/.test(s)) out.push(hexOf(path, s));
  });
  return out;
}

const sources: Source[] = [
  {
    id: "tailwind",
    name: "Tailwind CSS",
    license: "MIT",
    pkg: "tailwindcss",
    async read() {
      const out: RawColor[] = [];
      for (const m of text("tailwindcss", "theme.css").matchAll(
        /--color-([\w-]+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/g,
      )) {
        const [, name, l, c, h] = m;
        if (name === undefined || l === undefined || c === undefined || h === undefined) continue;
        out.push({
          label: name,
          oklch: { l: Number(l) / 100, c: Number(c), h: Number(h), alpha: 1 },
        });
      }
      return out;
    },
  },
  {
    id: "material",
    name: "Material Design (2014 palette)",
    license: "ISC",
    pkg: "material-colors",
    async read() {
      return hexLeaves(json("material-colors", "dist", "colors.json"));
    },
  },
  {
    id: "radix",
    name: "Radix Colors (light and dark)",
    license: "MIT",
    pkg: "@radix-ui/colors",
    async read() {
      const out: RawColor[] = [];
      const dir = pkgPath("@radix-ui/colors");
      // Light and dark scales; the alpha variants and black/white are skipped.
      const files = readdirSync(dir).filter(
        (f) => /^[a-z]+(-dark)?\.css$/.test(f) && !f.startsWith("black") && !f.startsWith("white"),
      );
      for (const f of files.sort()) {
        // The first block of each file holds the sRGB values.
        out.push(
          ...declaredHexes(readFileSync(join(dir, f), "utf8"), /--([\w-]+):\s*(#[0-9a-fA-F]{6});/g),
        );
      }
      return dedupeLabels(out);
    },
  },
  {
    id: "open-color",
    name: "Open Color",
    license: "MIT",
    pkg: "open-color",
    async read() {
      return hexLeaves(json("open-color", "open-color.json"));
    },
  },
  {
    id: "primer",
    name: "Primer (light and dark)",
    license: "MIT",
    pkg: "@primer/primitives",
    async read() {
      const out: RawColor[] = [];
      for (const theme of ["light", "dark"]) {
        const css = text(
          "@primer/primitives",
          "dist",
          "css",
          "functional",
          "themes",
          `${theme}.css`,
        );
        out.push(
          ...declaredHexes(css, /--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g).map((c) => ({
            ...c,
            label: `${theme}-${c.label}`,
          })),
        );
      }
      return out;
    },
  },
  {
    id: "carbon",
    name: "IBM Carbon",
    license: "Apache-2.0",
    pkg: "@carbon/colors",
    async read() {
      return hexesIn(text("@carbon/colors", "lib", "index.js"), "carbon");
    },
  },
  {
    id: "spectrum",
    name: "Adobe Spectrum",
    license: "Apache-2.0",
    pkg: "@adobe/spectrum-tokens",
    async read() {
      const raw = json("@adobe/spectrum-tokens", "dist", "json", "variables.json");
      const out: RawColor[] = [];
      if (!isRecord(raw)) return out;
      for (const [name, token] of Object.entries(raw)) {
        if (!isRecord(token) || !isRecord(token.sets)) continue;
        for (const [mode, set] of Object.entries(token.sets)) {
          if (mode === "wireframe" || !isRecord(set) || typeof set.value !== "string") continue;
          const m = /^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/.exec(set.value);
          if (!m) continue;
          const hex = [m[1], m[2], m[3]]
            .map((n) => Number(n).toString(16).padStart(2, "0"))
            .join("");
          out.push(hexOf(`${name} ${mode}`, hex));
        }
      }
      return out;
    },
  },
  {
    id: "fluent",
    name: "Fluent UI",
    license: "MIT",
    pkg: "@fluentui/tokens",
    async read() {
      const out: RawColor[] = [];
      for (const f of ["colors.js", "brandColors.js"]) {
        out.push(
          ...declaredHexes(
            text("@fluentui/tokens", "lib", "global", f),
            /['"]?([\w-]+)['"]?:\s*['"](#[0-9a-fA-F]{6})['"]/g,
          ),
        );
      }
      return out;
    },
  },
  {
    id: "ant",
    name: "Ant Design",
    license: "MIT",
    pkg: "@ant-design/colors",
    async read() {
      const mod: unknown = await import(pkgPath("@ant-design/colors", "lib", "index.js"));
      const presets =
        isRecord(mod) && isRecord(mod.presetPalettes)
          ? mod.presetPalettes
          : isRecord(mod) && isRecord(mod.default) && isRecord(mod.default.presetPalettes)
            ? mod.default.presetPalettes
            : undefined;
      if (!presets) throw new Error("ant: presetPalettes not found");
      return hexLeaves(presets);
    },
  },
  {
    id: "chakra",
    name: "Chakra UI",
    license: "MIT",
    pkg: "@chakra-ui/theme",
    async read() {
      const src = text("@chakra-ui/theme", "dist", "esm", "foundations", "colors.mjs");
      // Group objects like `red: { 50: "#..." }`; track the current group.
      const out: RawColor[] = [];
      let group = "";
      for (const line of src.split("\n")) {
        const g = /^\s{2}(\w+):\s*\{/.exec(line);
        if (g?.[1]) group = g[1];
        const v = /^\s+(\w+):\s*"(#[0-9a-fA-F]{6})"/.exec(line);
        if (v?.[1] && v[2])
          out.push(hexOf(line.startsWith("    ") ? `${group}-${v[1]}` : v[1], v[2]));
      }
      return out;
    },
  },
  {
    id: "bootstrap",
    name: "Bootstrap",
    license: "MIT",
    pkg: "bootstrap",
    async read() {
      return declaredHexes(
        text("bootstrap", "scss", "_variables.scss"),
        /^\$([\w-]+):\s*(#[0-9a-fA-F]{6})\b/gm,
      );
    },
  },
  {
    id: "simple-icons",
    name: "Simple Icons brand colors",
    license: "CC0-1.0",
    pkg: "simple-icons",
    async read() {
      const raw = json("simple-icons", "data", "simple-icons.json");
      const out: RawColor[] = [];
      if (!Array.isArray(raw)) return out;
      for (const item of raw) {
        if (isRecord(item) && typeof item.title === "string" && typeof item.hex === "string") {
          out.push(hexOf(item.title, item.hex));
        }
      }
      return out;
    },
  },
  {
    id: "xkcd",
    name: "XKCD color survey",
    license: "CC0-1.0",
    pkg: "xkcd-colors",
    async read() {
      const out: RawColor[] = [];
      for (const line of text("xkcd-colors", "assets", "xkcd_colors.txt").split("\n")) {
        const m = /^([^#\t][^\t]*)\t(#[0-9a-fA-F]{6})/.exec(line);
        if (m?.[1] && m[2]) out.push(hexOf(m[1], m[2]));
      }
      return out;
    },
  },
  {
    id: "css-named",
    name: "CSS named colors",
    license: "W3C CSS Color specification (names); values via color-name, MIT",
    pkg: "color-name",
    async read() {
      const src = text("color-name", "index.js");
      const out: RawColor[] = [];
      for (const m of src.matchAll(/^\s*(\w+):\s*\[(\d+),\s*(\d+),\s*(\d+)\]/gm)) {
        const [, name, r, g, b] = m;
        if (!name) continue;
        const hex = [r, g, b].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
        out.push(hexOf(name, hex));
      }
      return out;
    },
  },
  {
    id: "iscc-nbs",
    name: "ISCC-NBS centroids",
    license: "Public domain (NBS Circular 553); centroid values via matrioshka.colors, MIT",
    pkg: "matrioshka.colors",
    async read() {
      const raw = json("matrioshka.colors", "dist", "data", "iscc_nbs.json");
      const out: RawColor[] = [];
      if (!isRecord(raw) || !Array.isArray(raw.items)) return out;
      for (const item of raw.items) {
        const obj = isRecord(item) ? item.obj : undefined;
        if (isRecord(obj) && typeof obj.key === "string" && typeof obj.value === "string") {
          out.push(hexOf(obj.key.replace(/^ISCC_NBS_/, "").replaceAll("_", " "), obj.value));
        }
      }
      return out;
    },
  },
];

// A label can repeat across files (Radix light and dark share names).
function dedupeLabels(colors: RawColor[]): RawColor[] {
  const seen = new Map<string, number>();
  return colors.map((c) => {
    const n = (seen.get(c.label) ?? 0) + 1;
    seen.set(c.label, n);
    return n === 1 ? c : { ...c, label: `${c.label}#${n}` };
  });
}

async function main(): Promise<void> {
  const entries: SeedEntry[] = [];
  const seen = new Set<string>();
  const counts = new Map<string, SourceCount>();

  const read = new Map<string, RawColor[]>();
  for (const src of sources) {
    const colors = await src.read();
    if (colors.length === 0) throw new Error(`source ${src.id} produced no colors`);
    read.set(src.id, colors);
    counts.set(src.id, {
      source: src.id,
      name: src.name,
      license: src.license,
      package: `${src.pkg}@${pkgVersion(src.pkg)}`,
      read: colors.length,
      base: 0,
      scale: 0,
    });
  }

  function add(src: Source, raw: RawColor, kind: "base" | "scale", label: string): void {
    const key = colorKey(raw.oklch);
    const count = counts.get(src.id);
    if (!count || seen.has(key)) return;
    seen.add(key);
    entries.push({ key, source: src.id, license: src.license, kind, label });
    count[kind] += 1;
  }

  // Pass 1: every source's own colors, so a color is credited to the source
  // that names it. Pass 2: the buildColorValue scale of each, in source order.
  for (const src of sources) {
    for (const raw of read.get(src.id) ?? []) add(src, raw, "base", raw.label);
  }
  if (entries.length > SEED_CAP) {
    throw new Error(`base colors alone hold ${entries.length}, above the cap of ${SEED_CAP}`);
  }
  // The scales of all sources together exceed the cap, so they fill what is
  // left round-robin: round r takes the scale of every source's r-th color, so
  // each source keeps a share instead of the first sources taking it all.
  const longest = Math.max(...[...read.values()].map((c) => c.length));
  for (let r = 0; r < longest && entries.length < SEED_CAP; r++) {
    for (const src of sources) {
      const raw = read.get(src.id)?.[r];
      if (!raw) continue;
      const { scale } = buildColorValue(raw.oklch);
      for (const [i, step] of scale.entries()) {
        if (entries.length >= SEED_CAP) break;
        add(src, { oklch: step, label: raw.label }, "scale", `${raw.label} scale ${i + 1}`);
      }
    }
  }

  mkdirSync(seedDir, { recursive: true });
  // One entry per line keeps the committed file diffable.
  writeFileSync(
    join(seedDir, "colors.json"),
    `[\n${entries.map((e) => JSON.stringify(e)).join(",\n")}\n]\n`,
  );
  const summary = { total: entries.length, cap: SEED_CAP, sources: [...counts.values()] };
  writeFileSync(join(seedDir, "counts.json"), `${JSON.stringify(summary, null, 2)}\n`);
  for (const c of counts.values()) {
    console.log(
      `${c.source.padEnd(13)} read ${String(c.read).padStart(5)}  base ${String(c.base).padStart(5)}  scale ${String(c.scale).padStart(5)}`,
    );
  }
  console.log(`total ${entries.length} (cap ${SEED_CAP})`);
}

await main();
