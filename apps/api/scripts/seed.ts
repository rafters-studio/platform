// Seeds the color cache by sending every color in seed/colors.json through the
// deployed GET /api/color/:oklch. Run by the operator; it needs no Cloudflare
// access, only the worker's public URL.
//
//   pnpm --filter @platform/api run seed --url https://rafters.studio
//
// Options:
//   --url <base>          deployed worker (or SEED_URL)
//   --concurrency <n>     parallel requests, default 4
//   --limit <n>           only the first n listed colors
//   --state <file>        resume file, default seed/.state-<host>.jsonl
//   --generated-ms <ms>   a found response at least this slow counts as
//                         generated, default 1500
//
// Interrupt with Ctrl-C and run the same command again: colors already found
// are read from the state file and skipped.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { COLOR_KEY_PATTERN } from "../src/color/key";
import { runSeed, type Outcome } from "./seed-runner";

const seedDir = join(dirname(fileURLToPath(import.meta.url)), "..", "seed");

const { values } = parseArgs({
  options: {
    url: { type: "string" },
    concurrency: { type: "string", default: "4" },
    limit: { type: "string" },
    state: { type: "string" },
    "generated-ms": { type: "string", default: "1500" },
  },
});

const baseUrl = (values.url ?? process.env.SEED_URL ?? "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(baseUrl)) {
  console.error("usage: seed --url https://<deployed worker>");
  process.exit(2);
}

function positiveInt(raw: string | undefined, name: string): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    console.error(`--${name} must be a positive integer`);
    process.exit(2);
  }
  return n;
}

const concurrency = positiveInt(values.concurrency, "concurrency") ?? 4;
const limit = positiveInt(values.limit, "limit");
const generatedMs = positiveInt(values["generated-ms"], "generated-ms") ?? 1500;
const statePath =
  values.state ?? join(seedDir, `.state-${new URL(baseUrl).host.replace(/[^\w.-]/g, "_")}.jsonl`);

function readKeys(): string[] {
  const raw: unknown = JSON.parse(readFileSync(join(seedDir, "colors.json"), "utf8"));
  if (!Array.isArray(raw)) throw new Error("seed/colors.json is not an array");
  const keys: string[] = [];
  for (const entry of raw) {
    const key: unknown =
      typeof entry === "object" && entry !== null && "key" in entry ? entry.key : undefined;
    if (typeof key !== "string" || !COLOR_KEY_PATTERN.test(key))
      throw new Error(`bad seed key: ${String(key)}`);
    keys.push(key);
  }
  return limit ? keys.slice(0, limit) : keys;
}

function readDone(): Set<string> {
  const done = new Set<string>();
  if (!existsSync(statePath)) return done;
  for (const line of readFileSync(statePath, "utf8").split("\n")) {
    if (!line) continue;
    try {
      const row: unknown = JSON.parse(line);
      if (typeof row === "object" && row !== null && "key" in row && "outcome" in row) {
        if (typeof row.key === "string" && (row.outcome === "found" || row.outcome === "generated"))
          done.add(row.key);
      }
    } catch {
      // A line cut off by an interruption; that color is simply requested again.
    }
  }
  return done;
}

const keys = readKeys();
const done = readDone();
const abort = new AbortController();
process.on("SIGINT", () => {
  if (abort.signal.aborted) process.exit(130);
  console.error("\ninterrupted: finishing requests in flight (Ctrl-C again to quit now)");
  abort.abort();
});

console.log(
  `seeding ${keys.length} colors into ${baseUrl} (${done.size} already found, state ${statePath})`,
);

let settled = 0;
const total = keys.length - keys.filter((k) => done.has(k)).length;
const stats = await runSeed({
  baseUrl,
  keys,
  done,
  concurrency,
  attempts: 4,
  generatedMs,
  fetch: (url) => fetch(url),
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  signal: abort.signal,
  onResult: (key: string, outcome: Outcome, detail: string) => {
    appendFileSync(statePath, `${JSON.stringify({ key, outcome })}\n`);
    settled += 1;
    if (outcome === "error") console.error(`error ${key}: ${detail}`);
    if (settled % 100 === 0) console.log(`${settled}/${total}`);
  },
});

console.log(
  `generated ${stats.generated}, found ${stats.found}, near hits ${stats.near}, errors ${stats.errors}, skipped ${stats.skipped}` +
    (abort.signal.aborted ? " (interrupted; run again to resume)" : ""),
);
process.exit(stats.errors > 0 ? 1 : 0);
