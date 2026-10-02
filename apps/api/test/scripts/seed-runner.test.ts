import { describe, expect, it } from "vite-plus/test";
import { runSeed, type SeedOptions } from "../../scripts/seed-runner";

type Reply = { status: number; body?: unknown } | Error;

function harness(replies: Record<string, Reply[]>, overrides: Partial<SeedOptions> = {}) {
  let clock = 0;
  const calls: string[] = [];
  const results: Array<[string, string]> = [];
  const sleeps: number[] = [];
  const opts: SeedOptions = {
    baseUrl: "https://example.test",
    keys: Object.keys(replies),
    done: new Set(),
    concurrency: 1,
    attempts: 3,
    generatedMs: 1500,
    fetch: async (url) => {
      const key = url.split("/").pop() ?? "";
      calls.push(key);
      const reply = replies[key]?.shift();
      if (!reply) throw new Error(`no reply left for ${key}`);
      if (reply instanceof Error) throw reply;
      // A body of { ms } advances the fake clock to model a slow generation.
      const ms =
        typeof reply.body === "object" && reply.body !== null && "ms" in reply.body
          ? Number(reply.body.ms)
          : 10;
      clock += ms;
      return { status: reply.status, json: async () => reply.body };
    },
    now: () => clock,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    onResult: (key, outcome) => results.push([key, outcome]),
    ...overrides,
  };
  return { opts, calls, results, sleeps };
}

const found = { status: 200, body: { status: "found" } };

describe("runSeed", () => {
  it("counts a fast found response as found and a slow one as generated", async () => {
    const h = harness({
      "0.500-0.100-10": [found],
      "0.500-0.100-20": [{ status: 200, body: { status: "found", ms: 4000 } }],
    });
    const stats = await runSeed(h.opts);
    expect(stats).toMatchObject({ found: 1, generated: 1, near: 0, errors: 0 });
  });

  it("counts an approximate response as a near hit", async () => {
    const h = harness({ "0.500-0.100-10": [{ status: 200, body: { status: "approximate" } }] });
    expect((await runSeed(h.opts)).near).toBe(1);
  });

  it("skips colors already found and does not request them", async () => {
    const h = harness(
      { "0.500-0.100-10": [found], "0.500-0.100-20": [found] },
      { done: new Set(["0.500-0.100-10"]) },
    );
    const stats = await runSeed(h.opts);
    expect(h.calls).toEqual(["0.500-0.100-20"]);
    expect(stats.skipped).toBe(1);
  });

  it("stops taking new colors once aborted and reports what it finished", async () => {
    const abort = new AbortController();
    const h = harness(
      { "0.500-0.100-10": [found], "0.500-0.100-20": [found] },
      { signal: abort.signal },
    );
    h.opts.onResult = (key) => {
      h.results.push([key, "x"]);
      abort.abort();
    };
    const stats = await runSeed(h.opts);
    expect(h.calls).toEqual(["0.500-0.100-10"]);
    expect(stats.found).toBe(1);
  });

  it("retries a rate-limited error status after waiting, then succeeds", async () => {
    const h = harness({
      "0.500-0.100-10": [
        { status: 200, body: { status: "error", error: "Rate limit exceeded" } },
        found,
      ],
    });
    const stats = await runSeed(h.opts);
    expect(h.sleeps).toEqual([30_000]);
    expect(stats.found).toBe(1);
  });

  it("retries a network failure and an HTTP 503", async () => {
    const h = harness({ "0.500-0.100-10": [new Error("boom"), { status: 503 }, found] });
    expect((await runSeed(h.opts)).found).toBe(1);
  });

  it("reports an error after the attempts are used up", async () => {
    const h = harness({ "0.500-0.100-10": [{ status: 503 }, { status: 503 }, { status: 503 }] });
    const stats = await runSeed(h.opts);
    expect(stats.errors).toBe(1);
    expect(h.results).toEqual([["0.500-0.100-10", "error"]]);
  });

  it("reports a generation failure without retrying", async () => {
    const h = harness({
      "0.500-0.100-10": [{ status: 200, body: { status: "error", error: "validation failed" } }],
    });
    const stats = await runSeed(h.opts);
    expect(stats.errors).toBe(1);
    expect(h.calls).toHaveLength(1);
  });

  it("reports a 400 as an error without retrying", async () => {
    const h = harness({ "0.500-0.100-10": [{ status: 400 }] });
    expect((await runSeed(h.opts)).errors).toBe(1);
    expect(h.calls).toHaveLength(1);
  });
});
