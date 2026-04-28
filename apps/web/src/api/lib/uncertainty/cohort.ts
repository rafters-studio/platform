export const DAY_MS = 86_400_000;
export const DEFAULT_ORPHAN_TTL_DAYS = 30;
export const BUCKET_WIDTH = 0.1;
export const BUCKET_COUNT = 10;

export function bucketLower(confidence: number): number {
  if (confidence >= 1) return 0.9;
  if (confidence < 0) return 0;
  return Math.floor(confidence * 10) / 10;
}

export function cohortKey(
  surface: string,
  model: string,
  modelVersion: string,
  confidence: number,
): string {
  return `${surface}|${model}|${modelVersion}|${bucketLower(confidence).toFixed(1)}`;
}

export function brierScore(claimed: readonly number[], correctness: readonly number[]): number {
  if (claimed.length === 0 || claimed.length !== correctness.length) return 0;
  let sum = 0;
  for (let i = 0; i < claimed.length; i++) {
    const diff = claimed[i] - correctness[i];
    sum += diff * diff;
  }
  return sum / claimed.length;
}

export function bucketIndex(confidence: number): number {
  if (confidence >= 1) return BUCKET_COUNT - 1;
  if (confidence < 0) return 0;
  return Math.floor(confidence * BUCKET_COUNT);
}

export function bucketBounds(index: number): { lower: number; upper: number } {
  const lower = index * BUCKET_WIDTH;
  const upper = lower + BUCKET_WIDTH;
  return { lower, upper };
}
