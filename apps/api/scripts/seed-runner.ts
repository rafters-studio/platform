// The seeding loop: send each listed color through GET /api/color/:oklch.
// Pure of the filesystem and the network (both injected) so it can be tested.

export type Outcome = "generated" | "found" | "near" | "error";

export interface SeedStats {
  generated: number;
  found: number;
  near: number;
  errors: number;
  // Colors skipped because a previous run already got them as found.
  skipped: number;
}

export interface SeedOptions {
  baseUrl: string;
  keys: readonly string[];
  // Keys a previous run already finished as found; they are not requested.
  done: ReadonlySet<string>;
  concurrency: number;
  // Attempts per color for transport failures and rate limits.
  attempts: number;
  // A found response slower than this was generated, not read from the cache:
  // the API response does not say which it was.
  generatedMs: number;
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

type Reply =
  | { kind: "ok"; status: string; ms: number }
  | { kind: "retry"; detail: string; waitMs: number }
  | { kind: "fail"; detail: string };

async function request(opts: SeedOptions, key: string): Promise<Reply> {
  const started = opts.now();
  let res: Awaited<ReturnType<SeedOptions["fetch"]>>;
  try {
    res = await opts.fetch(`${opts.baseUrl}/api/color/${key}`);
  } catch (error) {
    return {
      kind: "retry",
      detail: error instanceof Error ? error.message : "network error",
      waitMs: 2_000,
    };
  }
  const ms = opts.now() - started;
  if (res.status === 429 || res.status >= 500) {
    return {
      kind: "retry",
      detail: `HTTP ${res.status}`,
      waitMs: res.status === 429 ? 30_000 : 2_000,
    };
  }
  if (res.status !== 200) return { kind: "fail", detail: `HTTP ${res.status}` };
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { kind: "fail", detail: "response was not JSON" };
  }
  if (!isRecord(body) || typeof body.status !== "string")
    return { kind: "fail", detail: "response has no status" };
  if (body.status === "error") {
    const message = typeof body.error === "string" ? body.error : "error status";
    // A rate-limited generation is stored nowhere, so asking again later works.
    if (/rate.?limit|too many/i.test(message))
      return { kind: "retry", detail: message, waitMs: 30_000 };
    return { kind: "fail", detail: message };
  }
  return { kind: "ok", status: body.status, ms };
}

async function seedOne(opts: SeedOptions, key: string): Promise<[Outcome, string]> {
  let last = "";
  for (let attempt = 1; attempt <= opts.attempts; attempt++) {
    const reply = await request(opts, key);
    if (reply.kind === "ok") {
      if (reply.status === "found") {
        return [reply.ms >= opts.generatedMs ? "generated" : "found", `${reply.ms}ms`];
      }
      if (reply.status === "approximate") return ["near", `${reply.ms}ms`];
      return ["error", `unexpected status ${reply.status}`];
    }
    last = reply.detail;
    if (reply.kind === "fail") return ["error", last];
    if (attempt < opts.attempts) await opts.sleep(reply.waitMs);
  }
  return ["error", last];
}

export async function runSeed(opts: SeedOptions): Promise<SeedStats> {
  const stats: SeedStats = { generated: 0, found: 0, near: 0, errors: 0, skipped: 0 };
  const queue = opts.keys.filter((key) => {
    if (opts.done.has(key)) {
      stats.skipped += 1;
      return false;
    }
    return true;
  });
  let next = 0;

  async function worker(): Promise<void> {
    while (!opts.signal?.aborted) {
      const key = queue[next++];
      if (key === undefined) return;
      const [outcome, detail] = await seedOne(opts, key);
      if (outcome === "generated") stats.generated += 1;
      else if (outcome === "found") stats.found += 1;
      else if (outcome === "near") stats.near += 1;
      else stats.errors += 1;
      opts.onResult(key, outcome, detail);
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency) }, worker));
  return stats;
}
