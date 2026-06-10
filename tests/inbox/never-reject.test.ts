import { beforeEach, describe, expect, it, vi } from "vitest";

const ingestInboundEmail = vi.fn();
vi.mock("../../apps/inbox/src/lib/inbound", () => ({
  ingestInboundEmail: (...args: unknown[]) => ingestInboundEmail(...args),
}));

import worker from "../../apps/inbox/src/index";

type PutCall = { key: string; metadata: Record<string, string> | undefined };

function mockEnv() {
  const puts: PutCall[] = [];
  const env = {
    rafters_email: {
      put: vi.fn(
        async (key: string, _body: unknown, opts?: { customMetadata?: Record<string, string> }) => {
          puts.push({ key, metadata: opts?.customMetadata });
        },
      ),
    },
  };
  return { env: env as never, puts, putMock: env.rafters_email.put };
}

function mockMessage(rawBody: BodyInit | ReadableStream = "From: a@b.co\r\n\r\nhello") {
  return {
    from: "sender@example.com",
    to: "support@rafters.studio",
    raw: rawBody instanceof ReadableStream ? rawBody : new Response(rawBody).body,
  } as never;
}

function brokenStream(): ReadableStream {
  return new ReadableStream({
    start(controller) {
      controller.error(new Error("stream exploded"));
    },
  });
}

beforeEach(() => {
  ingestInboundEmail.mockReset();
});

describe("inbox worker never-reject doctrine", () => {
  it("acks a successfully ingested email without touching the failed/ prefix", async () => {
    ingestInboundEmail.mockResolvedValue({ status: "stored", messageId: "m1" });
    const { env, puts } = mockEnv();

    await expect(worker.email?.(mockMessage(), env, {} as never)).resolves.toBeUndefined();
    expect(puts).toHaveLength(0);
  });

  it("never rethrows when ingestion fails, and stores the raw email under failed/", async () => {
    ingestInboundEmail.mockRejectedValue(new Error("D1 is on fire"));
    const { env, puts } = mockEnv();

    await expect(worker.email?.(mockMessage(), env, {} as never)).resolves.toBeUndefined();

    expect(puts).toHaveLength(1);
    const stored = puts[0];
    expect(stored.key).toMatch(/^failed\/\d{4}\/\d{2}\/.+\.eml$/);
    expect(stored.metadata).toMatchObject({
      from: "sender@example.com",
      to: "support@rafters.studio",
      reason: "processing-failed",
    });
    expect(stored.metadata?.error).toContain("D1 is on fire");
  });

  it("never rethrows even when the failed-email store also fails", async () => {
    ingestInboundEmail.mockRejectedValue(new Error("ingest failed"));
    const { env, putMock } = mockEnv();
    putMock.mockRejectedValue(new Error("R2 is also on fire"));

    await expect(worker.email?.(mockMessage(), env, {} as never)).resolves.toBeUndefined();
  });

  it("acks without retry when the raw stream cannot be read", async () => {
    const { env, puts } = mockEnv();

    await expect(
      worker.email?.(mockMessage(brokenStream()), env, {} as never),
    ).resolves.toBeUndefined();

    expect(ingestInboundEmail).not.toHaveBeenCalled();
    expect(puts).toHaveLength(0);
  });

  it("passes the raw buffer through to ingestion intact", async () => {
    ingestInboundEmail.mockResolvedValue({ status: "stored", messageId: "m2" });
    const { env } = mockEnv();
    const body = "From: x@y.z\r\nSubject: hi\r\n\r\nbody text";

    await worker.email?.(mockMessage(body), env, {} as never);

    const buffer = ingestInboundEmail.mock.calls[0]?.[2] as ArrayBuffer;
    expect(new TextDecoder().decode(buffer)).toBe(body);
  });
});
