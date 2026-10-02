import type { OKLCH } from "@rafters/shared";

// Cache key for a color: "L.LLL-C.CCC-H", with H a whole degree in [0, 360).
// The color API and the seed script both key colors through colorKey, so a
// seeded color and a requested color land on the same row.
export const COLOR_KEY_PATTERN = /^(0\.\d{3}|1\.000)-(0\.\d{3})-(\d{1,3})$/;

export function colorKey(oklch: OKLCH): string {
  const l = Math.min(Math.max(oklch.l, 0), 1).toFixed(3);
  const c = Math.max(oklch.c, 0).toFixed(3);
  // A color whose chroma rounds to zero is a gray; its hue carries no
  // information, so every gray at a lightness shares one key.
  const h = c === "0.000" ? 0 : ((Math.round(oklch.h) % 360) + 360) % 360;
  return `${l}-${c}-${h}`;
}

export function parseColorKey(key: string): OKLCH | null {
  const match = COLOR_KEY_PATTERN.exec(key);
  if (!match) return null;
  const h = Number(match[3]);
  if (h >= 360) return null;
  return { l: Number(match[1]), c: Number(match[2]), h, alpha: 1 };
}
