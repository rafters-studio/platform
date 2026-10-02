import { bannedTermIn } from "./banned-label-terms";
import type { RejectedLabel } from "./intelligence";

// Splits candidates, in rank order, into the ones that pass the banned-term
// check and the ones rejected with the reason.
export function screenLabels(candidates: readonly string[]): {
  passing: string[];
  rejected: RejectedLabel[];
} {
  const passing: string[] = [];
  const rejected: RejectedLabel[] = [];
  for (const raw of candidates) {
    const label = raw.trim();
    if (!label) continue;
    const banned = bannedTermIn(label);
    if (banned) rejected.push({ label, reason: `contains the banned term "${banned}"` });
    else passing.push(label);
  }
  return { passing, rejected };
}
