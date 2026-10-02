// The seeding loop: send each listed color through GET /api/color/:oklch.
// Pure of the filesystem and the network (both injected) so it can be tested.

// generated: status "found" with source "generated". found: status "found" with
// source "cache". near: status "approximate". error: anything else.
export type Outcome = "generated" | "found" | "near" | "error";

export interface SeedStats {
  generated: number;
  found: number;
  near: number;
  errors: number;
  // Colors skipped because a previous run already finished them.
  skipped: number;
}

export interface SeedOptions {
  baseUrl: string;
  keys: readonly string[];
  // Keys a previous run already finished; they are not requested.
  done: ReadonlySet<string>;
  // Upper bound on requests started per minute.
  perMinute: number;
  // How long to wait after a "service is busy" error response.
  busyWaitMs: number;
  fetch: (url: string) => Promise<{ status: number; json: () => Promise<unknown> }>;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  // Called after each color is settled, for the resume state and progress.
  onResult: (key: string, outcome: Outcome, detail: string) => void;
  signal?: AbortSignal;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

interface Classified {
  outcome: Outcome;
  detail: string;
  busy: boolean;
}

async function classify(opts: SeedOptions, key: string): Promise<Classified> {
  let res: Awaited<ReturnType<SeedOptions["fetch"]>>;
  try {
    res = await opts.fetch(`${opts.baseUrl}/api/color/${key}`);
  } catch (error) {
    return {
      outcome: "error",
      detail: error instanceof Error ? error.message : "network error",
      busy: false,
    };
  }
  if (res.status === 429) return { outcome: "error", detail: "HTTP 429", busy: true };
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { outcome: "error", detail: `HTTP ${res.status}, body was not JSON`, busy: false };
  }
  if (!isRecord(body) || typeof body.status !== "string") {
    return { outcome: "error", detail: `HTTP ${res.status}, response has no status`, busy: false };
  }
  if (body.status === "found") {
    if (body.source === "generated") return { outcome: "generated", detail: "", busy: false };
    if (body.source === "cache") return { outcome: "found", detail: "", busy: false };
    return { outcome: "error", detail: "found response has no known source", busy: false };
  }
  if (body.status === "approximate") return { outcome: "near", detail: "", busy: false };
  const message = typeof body.error === "string" ? body.error : `status ${body.status}`;
  return { outcome: "error", detail: message, busy: /busy/i.test(message) };
}

export async function runSeed(opts: SeedOptions): Promise<SeedStats> {
  const stats: SeedStats = { generated: 0, found: 0, near: 0, errors: 0, skipped: 0 };
  const gapMs = 60_000 / opts.perMinute;
  let lastStart: number | undefined;

  for (const key of opts.keys) {
    if (opts.signal?.aborted) break;
    if (opts.done.has(key)) {
      stats.skipped += 1;
      continue;
    }
    if (lastStart !== undefined) {
      const wait = lastStart + gapMs - opts.now();
      if (wait > 0) await opts.sleep(wait);
      if (opts.signal?.aborted) break;
    }
    lastStart = opts.now();
    const { outcome, detail, busy } = await classify(opts, key);
    if (outcome === "generated") stats.generated += 1;
    else if (outcome === "found") stats.found += 1;
    else if (outcome === "near") stats.near += 1;
    else stats.errors += 1;
    opts.onResult(key, outcome, detail);
    if (busy) {
      await opts.sleep(opts.busyWaitMs);
      lastStart = opts.now();
    }
  }
  return stats;
}
