/**
 * One-shot script: delete the 11 bad-shape vectors from rafters-color-vocab.
 *
 * These were seeded during the overstepped spike (reflection 019dd027). Their
 * IDs use CSS hex shorthand (#00f, #ff0, ...) which does not match the canonical
 * OKLCH-path shape that the real port will use. They must be removed before
 * any production vectors are written to avoid polluting nearest-neighbor lookups.
 *
 * Run via: pnpm --filter @rafters-studio/web exec wrangler vectorize delete-vectors \
 *           rafters-color-vocab --ids '#00f' '#ff0' '#808080' '#f0f' '#0f0' '#fff' '#f80' '#80f' '#f00' '#000' '#0ff'
 *
 * Verify after run:
 *   pnpm --filter @rafters-studio/web exec wrangler vectorize list-vectors rafters-color-vocab
 *   (expect: "0 of 0 total vectors")
 */

export const BAD_VECTOR_IDS = [
  "#00f",
  "#ff0",
  "#808080",
  "#f0f",
  "#0f0",
  "#fff",
  "#f80",
  "#80f",
  "#f00",
  "#000",
  "#0ff",
] as const;
