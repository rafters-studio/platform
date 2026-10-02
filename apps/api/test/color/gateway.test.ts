import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { buildColorValue } from "@rafters/color-utils";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { createGatewayClient, gatewayBaseURL } from "../../src/color/gateway";
import { generateIntelligence, INTELLIGENCE_MODEL } from "../../src/color/intelligence";

interface Seen {
  url: string;
  headers: IncomingHttpHeaders;
  body: Record<string, unknown>;
}

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

async function stub(reply: { stop_reason: string; text: string }) {
  const seen: Seen[] = [];
  const stubServer = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => (raw += chunk.toString()));
    req.on("end", () => {
      seen.push({
        url: req.url ?? "",
        headers: req.headers,
        body: JSON.parse(raw) as Record<string, unknown>,
      });
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          id: "msg_1",
          type: "message",
          role: "assistant",
          model: INTELLIGENCE_MODEL,
          content: [{ type: "text", text: reply.text }],
          stop_reason: reply.stop_reason,
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
      );
    });
  });
  server = stubServer;
  await new Promise<void>((resolve) => stubServer.listen(0, "127.0.0.1", resolve));
  const { port } = stubServer.address() as AddressInfo;
  return { seen, baseURL: `http://127.0.0.1:${port}/v1/acct/rafters-color-intel/anthropic` };
}

const OKLCH = { l: 0.5, c: 0.1, h: 240, alpha: 1 };
const ENV = { CF_API_KEY: "acct", CF_WORKER_AI_KEY: "gateway-token" };
const GOOD = JSON.stringify({
  labelCandidates: ["A", "B", "C"],
  reasoning: "r",
  emotionalImpact: "e",
  culturalContext: "c",
  accessibilityNotes: "a",
  usageGuidance: "u",
  balancingGuidance: "b",
});

describe("gateway client", () => {
  it("points at the gateway's Anthropic path for the account", () => {
    expect(gatewayBaseURL("acct")).toBe(
      "https://gateway.ai.cloudflare.com/v1/acct/rafters-color-intel/anthropic",
    );
  });

  it("sends the gateway headers and no Anthropic key to the messages path", async () => {
    const { seen, baseURL } = await stub({ stop_reason: "end_turn", text: GOOD });
    const client = createGatewayClient(ENV, baseURL);
    const result = await generateIntelligence(client, OKLCH, buildColorValue(OKLCH), []);

    expect(result.candidates).toEqual(["A", "B", "C"]);
    expect(seen).toHaveLength(1);
    const [request] = seen;
    expect(request?.url).toBe("/v1/acct/rafters-color-intel/anthropic/v1/messages");
    expect(request?.headers["x-api-key"]).toBeUndefined();
    expect(request?.headers.authorization).toBeUndefined();
    expect(request?.headers["cf-aig-authorization"]).toBe("Bearer gateway-token");
    expect(request?.headers["cf-aig-byok-alias"]).toBe("claude");
    expect(request?.headers["anthropic-beta"]).toBeUndefined();
    expect(request?.body.model).toBe("claude-sonnet-5-5");
    expect(request?.body.max_tokens).toBe(16000);
    expect(request?.body.fallbacks).toBeUndefined();
    expect(request?.body.output_config).toMatchObject({ effort: "medium" });
  });

  it("reports a reply cut off at max_tokens as cut off, not as a parse failure", async () => {
    const { baseURL } = await stub({ stop_reason: "max_tokens", text: '{"label' });
    const client = createGatewayClient(ENV, baseURL);
    await expect(generateIntelligence(client, OKLCH, buildColorValue(OKLCH), [])).rejects.toThrow(
      "Color intelligence response was cut off",
    );
  });

  it("reports a refusal as refused", async () => {
    const { baseURL } = await stub({ stop_reason: "refusal", text: "" });
    const client = createGatewayClient(ENV, baseURL);
    await expect(generateIntelligence(client, OKLCH, buildColorValue(OKLCH), [])).rejects.toThrow(
      "Color intelligence request was refused",
    );
  });
});
