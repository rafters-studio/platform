import type { OKLCH } from "@rafters/shared";

export interface OKLab {
  l: number;
  a: number;
  b: number;
}

export function toOKLab(oklch: OKLCH): OKLab {
  const hue = (oklch.h * Math.PI) / 180;
  return { l: oklch.l, a: oklch.c * Math.cos(hue), b: oklch.c * Math.sin(hue) };
}

// Euclidean distance in OKLab, the deltaE CSS Color 4 uses for gamut mapping.
export function deltaEOK(x: OKLab, y: OKLab): number {
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b);
}
