import { describe, expect, it, vi } from "vitest";
import {
  type ColorSeedMessage,
  colorIntelPath,
  colorSeedMessageSchema,
  internalColorRequest,
  isSuccessStatus,
  processColorSeedBatch,
} from "../../../apps/web/src/queue/color-consumer";

function seedMessage(body: unknown) {
  return {
    body,
    ack: vi.fn(),
    retry: vi.fn(),
  } as never;
}

function stubApp(status: number | ((url: string) => number)) {
  const calls: string[] = [];
  const app = {
    fetch: vi.fn(async (req: Request) => {
      calls.push(req.url);
      const code = typeof status === "function" ? status(req.url) : status;
      return new Response(null, { status: code });
    }),
  };
  return { app: app as never, calls };
}

const oklch = { l: 0.5, c: 0.12, h: 240 };

describe("colorIntelPath", () => {
  it("formats L.LLL-C.CCC-H matching the route's path contract", () => {
    expect(colorIntelPath(oklch)).toBe("0.500-0.120-240");
  });

  it("rounds hue to an integer", () => {
    expect(colorIntelPath({ l: 0.7, c: 0.15, h: 259.7 })).toBe("0.700-0.150-260");
  });
});

describe("internalColorRequest", () => {
  it("targets the sync color route through the internal origin", () => {
    const req = internalColorRequest({ oklch });
    expect(req.url).toBe("http://internal/api/color/0.500-0.120-240?sync=true");
    expect(req.method).toBe("GET");
  });
});

describe("isSuccessStatus", () => {
  it("treats 200 and 202 as success, everything else as failure", () => {
    expect(isSuccessStatus(200)).toBe(true);
    expect(isSuccessStatus(202)).toBe(true);
    expect(isSuccessStatus(500)).toBe(false);
    expect(isSuccessStatus(429)).toBe(false);
    expect(isSuccessStatus(404)).toBe(false);
  });
});

describe("colorSeedMessageSchema", () => {
  it("accepts the producer's message shape", () => {
    const message: ColorSeedMessage = {
      oklch,
      requestId: "any-string",
      timestamp: Date.now(),
    };
    expect(colorSeedMessageSchema.safeParse(message).success).toBe(true);
  });

  it("accepts the minimal shape the old publisher may have queued", () => {
    expect(colorSeedMessageSchema.safeParse({ oklch }).success).toBe(true);
  });

  it("rejects payloads without oklch", () => {
    expect(colorSeedMessageSchema.safeParse({ requestId: "x" }).success).toBe(false);
  });
});

describe("processColorSeedBatch", () => {
  it("acks messages when the internal sync route succeeds", async () => {
    const { app } = stubApp(200);
    const message = seedMessage({ oklch });

    await processColorSeedBatch({ messages: [message] } as never, {} as never, app);

    expect((message as { ack: ReturnType<typeof vi.fn> }).ack).toHaveBeenCalledOnce();
    expect((message as { retry: ReturnType<typeof vi.fn> }).retry).not.toHaveBeenCalled();
  });

  it("acks on 202 -- another writer finishing first is still done", async () => {
    const { app } = stubApp(202);
    const message = seedMessage({ oklch });

    await processColorSeedBatch({ messages: [message] } as never, {} as never, app);

    expect((message as { ack: ReturnType<typeof vi.fn> }).ack).toHaveBeenCalledOnce();
  });

  it("retries when the sync route fails", async () => {
    const { app } = stubApp(500);
    const message = seedMessage({ oklch });

    await processColorSeedBatch({ messages: [message] } as never, {} as never, app);

    expect((message as { retry: ReturnType<typeof vi.fn> }).retry).toHaveBeenCalledOnce();
    expect((message as { ack: ReturnType<typeof vi.fn> }).ack).not.toHaveBeenCalled();
  });

  it("retries when the internal dispatch throws", async () => {
    const app = {
      fetch: vi.fn(async () => {
        throw new Error("gateway down");
      }),
    } as never;
    const message = seedMessage({ oklch });

    await processColorSeedBatch({ messages: [message] } as never, {} as never, app);

    expect((message as { retry: ReturnType<typeof vi.fn> }).retry).toHaveBeenCalledOnce();
  });

  it("acks malformed payloads instead of retrying them forever", async () => {
    const { app } = stubApp(200);
    const message = seedMessage({ nonsense: true });

    await processColorSeedBatch({ messages: [message] } as never, {} as never, app);

    expect((message as { ack: ReturnType<typeof vi.fn> }).ack).toHaveBeenCalledOnce();
    expect(app.fetch).not.toHaveBeenCalled();
  });

  it("isolates failures: one bad message does not block the rest of the batch", async () => {
    const { app } = stubApp((url) => (url.includes("0.900") ? 500 : 200));
    const good = seedMessage({ oklch });
    const bad = seedMessage({ oklch: { l: 0.9, c: 0.1, h: 100 } });

    await processColorSeedBatch({ messages: [good, bad] } as never, {} as never, app);

    expect((good as { ack: ReturnType<typeof vi.fn> }).ack).toHaveBeenCalledOnce();
    expect((bad as { retry: ReturnType<typeof vi.fn> }).retry).toHaveBeenCalledOnce();
  });
});
