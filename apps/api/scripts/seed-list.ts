// Shape of the committed seed list (apps/api/seed/colors.json).

// "About 25,000": the budget the issue sets for the seed.
export const SEED_CAP = 25_000;

export interface SeedEntry {
  // colorKey of the color: "L.LLL-C.CCC-H".
  key: string;
  // Source id, as listed in counts.json.
  source: string;
  // License of the source's data.
  license: string;
  // base: a color the source names. scale: a buildColorValue scale step of one.
  kind: "base" | "scale";
  label: string;
}

export interface SourceCount {
  source: string;
  name: string;
  license: string;
  package: string;
  // Colors read from the source, before conversion and dedupe.
  read: number;
  // Entries kept in the list after dedupe, by kind.
  base: number;
  scale: number;
}
