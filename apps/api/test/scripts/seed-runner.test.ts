import { describe, expect, it } from "vite-plus/test";
import { runSeed, type SeedOptions } from "../../scripts/seed-runner";

type Reply = { status: number; body?: unknown } | Error;

function harness(replies: Record<string, Reply[]>, overrides: Partial<SeedOptions> = {}) {
  let clock = 0;
  const calls: Array<[string, number]> = [];
  const results: Array<[string, string]> = [];
  const sleeps: number[] = [];
  const opts: SeedOptions = {
    baseUrl: "https://example.test",
    keys: Object.keys(replies),
    done: new Set(),
    perMinute: 30,
    busyWaitMs: 60_000,
    fetch: async (url) => {
      const key = url.split("/").pop() ?? "";
      calls.push([key, clock]);
      const reply = replies[key]?.shift();
      if (!reply) throw new Error(`no reply left for ${key}`);
      if (reply instanceof Error) throw reply;
      return { status: reply.status, json: async () => reply.body };
    },
    now: () => clock,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    onResult: (key, outcome) => results.push([key, outcome]),
    ...overrides,
  };
  return { opts, calls, results, sleeps };
}

const generated = { status: 200, body: { status: "found", source: "generated" } };
const cached = { status: 200, body: { status: "found", source: "cache" } };
const K1 = "0.500-0.100-10";
const K2 = "0.500-0.100-20";

describe("runSeed", () => {
  it("counts found with source generated as generated and source cache as found", async () => {
    const h = harness({ [K1]: [generated], [K2]: [cached] });
    expect(await runSeed(h.opts)).toMatchObject({ generated: 1, found: 1, near: 0, errors: 0 });
  });

  it("counts an approximate response as a near hit", async () => {
    const h = harness({ [K1]: [{ status: 200, body: { status: "approximate" } }] });
    expect((await runSeed(h.opts)).near).toBe(1);
  });

  it("counts an error status as an error", async () => {
    const h = harness({ [K1]: [{ status: 200, body: { status: "error", error: "bad" } }] });
    const stats = await runSeed(h.opts);
    expect(stats.errors).toBe(1);
    expect(h.results).toEqual([[K1, "error"]]);
  });

  it("counts a thrown fetch and a non-JSON body as errors", async () => {
    const h = harness({ [K1]: [new Error("boom")], [K2]: [{ status: 502 }] });
    expect((await runSeed(h.opts)).errors).toBe(2);
  });

  it("skips colors already done and does not request them", async () => {
    const h = harness({ [K1]: [cached], [K2]: [cached] }, { done: new Set([K1]) });
    const stats = await runSeed(h.opts);
    expect(h.calls.map(([k]) => k)).toEqual([K2]);
    expect(stats.skipped).toBe(1);
  });

  it("stops taking new colors once aborted", async () => {
    const abort = new AbortController();
    const h = harness({ [K1]: [cached], [K2]: [cached] }, { signal: abort.signal });
    h.opts.onResult = () => abort.abort();
    const stats = await runSeed(h.opts);
    expect(h.calls.map(([k]) => k)).toEqual([K1]);
    expect(stats.found).toBe(1);
  });

  it("starts requests no closer together than the configured rate", async () => {
    const h = harness({ [K1]: [cached], [K2]: [cached], "0.500-0.100-30": [cached] });
    await runSeed(h.opts);
    expect(h.calls.map(([, t]) => t)).toEqual([0, 2000, 4000]);
  });

  it("honors a custom rate", async () => {
    const h = harness({ [K1]: [cached], [K2]: [cached] }, { perMinute: 10 });
    await runSeed(h.opts);
    expect(h.calls.map(([, t]) => t)).toEqual([0, 6000]);
  });

  it("waits 60 seconds after a busy error, then continues", async () => {
    const h = harness({
      [K1]: [{ status: 200, body: { status: "error", error: "Service is busy, try again" } }],
      [K2]: [cached],
    });
    const stats = await runSeed(h.opts);
    expect(h.sleeps[0]).toBe(60_000);
    expect(stats).toMatchObject({ errors: 1, found: 1 });
  });

  it("does not wait 60 seconds after other errors", async () => {
    const h = harness({
      [K1]: [{ status: 200, body: { status: "error", error: "validation failed" } }],
      [K2]: [cached],
    });
    await runSeed(h.opts);
    expect(h.sleeps).not.toContain(60_000);
  });
});
