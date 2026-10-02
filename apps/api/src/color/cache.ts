import type { ColorIntelligence } from "@rafters/shared";
import { deltaEOK, type OKLab } from "./oklab";

// CSS Color 4's just-noticeable difference in OKLab. A cached color closer
// than this looks the same, so its intelligence is served for the request.
export const NEAR_MATCH_DELTA_E = 0.02;

// Cached colors this close are shown to the model so a new label can differ.
export const NEIGHBOR_DELTA_E = 0.1;
export const NEIGHBOR_LIMIT = 20;

export interface NearMatch {
  key: string;
  deltaE: number;
  intelligence: ColorIntelligence;
}

// What the model writes besides the label: the six text fields.
export interface IntelligenceText {
  reasoning: string;
  emotionalImpact: string;
  culturalContext: string;
  accessibilityNotes: string;
  usageGuidance: string;
  balancingGuidance: string;
}

interface IntelligenceColumns {
  label: string | null;
  reasoning: string;
  emotional_impact: string;
  cultural_context: string;
  accessibility_notes: string;
  usage_guidance: string;
  balancing_guidance: string;
}

interface CacheRow extends IntelligenceColumns {
  key: string;
  ok_l: number;
  ok_a: number;
  ok_b: number;
}

const INTELLIGENCE_COLUMNS = `label, reasoning, emotional_impact, cultural_context,
  accessibility_notes, usage_guidance, balancing_guidance`;

function toIntelligence(row: IntelligenceColumns): ColorIntelligence {
  return {
    ...(row.label === null ? {} : { label: row.label }),
    reasoning: row.reasoning,
    emotionalImpact: row.emotional_impact,
    culturalContext: row.cultural_context,
    accessibilityNotes: row.accessibility_notes,
    usageGuidance: row.usage_guidance,
    balancingGuidance: row.balancing_guidance,
  };
}

export async function findExact(db: D1Database, key: string): Promise<ColorIntelligence | null> {
  const row = await db
    .prepare(`SELECT ${INTELLIGENCE_COLUMNS} FROM color_cache WHERE key = ?1`)
    .bind(key)
    .first<IntelligenceColumns>();
  return row ? toIntelligence(row) : null;
}

export async function findNearest(db: D1Database, lab: OKLab): Promise<NearMatch | null> {
  const d = NEAR_MATCH_DELTA_E;
  // The box query narrows candidates through the OKLab index; the box's
  // corners reach past the sphere, so the distance is checked again below.
  const row = await db
    .prepare(
      `SELECT key, ok_l, ok_a, ok_b, ${INTELLIGENCE_COLUMNS} FROM color_cache
       WHERE ok_l BETWEEN ?1 AND ?2 AND ok_a BETWEEN ?3 AND ?4 AND ok_b BETWEEN ?5 AND ?6
       ORDER BY (ok_l - ?7) * (ok_l - ?7) + (ok_a - ?8) * (ok_a - ?8) + (ok_b - ?9) * (ok_b - ?9)
       LIMIT 1`,
    )
    .bind(lab.l - d, lab.l + d, lab.a - d, lab.a + d, lab.b - d, lab.b + d, lab.l, lab.a, lab.b)
    .first<CacheRow>();
  if (!row) return null;

  const deltaE = deltaEOK(lab, { l: row.ok_l, a: row.ok_a, b: row.ok_b });
  if (deltaE > d) return null;
  return { key: row.key, deltaE, intelligence: toIntelligence(row) };
}

// Labels of up to NEIGHBOR_LIMIT cached colors within NEIGHBOR_DELTA_E of lab,
// nearest first.
export async function nearbyLabels(db: D1Database, lab: OKLab): Promise<string[]> {
  const d = NEIGHBOR_DELTA_E;
  const { results } = await db
    .prepare(
      `SELECT label, ok_l, ok_a, ok_b FROM color_cache
       WHERE label IS NOT NULL
         AND ok_l BETWEEN ?1 AND ?2 AND ok_a BETWEEN ?3 AND ?4 AND ok_b BETWEEN ?5 AND ?6
       ORDER BY (ok_l - ?7) * (ok_l - ?7) + (ok_a - ?8) * (ok_a - ?8) + (ok_b - ?9) * (ok_b - ?9)
       LIMIT ?10`,
    )
    .bind(
      lab.l - d,
      lab.l + d,
      lab.a - d,
      lab.a + d,
      lab.b - d,
      lab.b + d,
      lab.l,
      lab.a,
      lab.b,
      NEIGHBOR_LIMIT * 2,
    )
    .all<{ label: string; ok_l: number; ok_a: number; ok_b: number }>();
  // The box reaches past the sphere, so the distance is checked again.
  return results
    .filter((r) => deltaEOK(lab, { l: r.ok_l, a: r.ok_a, b: r.ok_b }) <= d)
    .slice(0, NEIGHBOR_LIMIT)
    .map((r) => r.label);
}

export async function labelTaken(db: D1Database, label: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 AS taken FROM color_cache WHERE label = ?1 COLLATE NOCASE")
    .bind(label)
    .first<{ taken: number }>();
  return row !== null;
}

// True when a write failed on the unique label index, meaning a concurrent
// request took the label first.
export function isLabelConflict(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /UNIQUE constraint failed/i.test(message) && /label/i.test(message);
}

export interface StoreInput {
  key: string;
  lab: OKLab;
  label: string | null;
  text: IntelligenceText;
  model: string;
}

// Two requests can generate the same new color at once; the first write wins.
// A label taken meanwhile throws an error isLabelConflict recognizes.
export async function store(db: D1Database, input: StoreInput): Promise<void> {
  const { key, lab, label, text, model } = input;
  await db
    .prepare(
      `INSERT INTO color_cache (key, ok_l, ok_a, ok_b, label, reasoning, emotional_impact,
         cultural_context, accessibility_notes, usage_guidance, balancing_guidance, model, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
       ON CONFLICT (key) DO NOTHING`,
    )
    .bind(
      key,
      lab.l,
      lab.a,
      lab.b,
      label,
      text.reasoning,
      text.emotionalImpact,
      text.culturalContext,
      text.accessibilityNotes,
      text.usageGuidance,
      text.balancingGuidance,
      model,
      Date.now(),
    )
    .run();
}
