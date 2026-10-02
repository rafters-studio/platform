import Anthropic from "@anthropic-ai/sdk";

// The AI Gateway that fronts Claude, and the alias under which the gateway
// stores the Anthropic key. The worker never holds an Anthropic key.
export const GATEWAY_ID = "rafters-color-intel";
export const KEY_ALIAS = "claude";

export function gatewayBaseURL(accountId: string): string {
  return `https://gateway.ai.cloudflare.com/v1/${accountId}/${GATEWAY_ID}/anthropic`;
}

// One client per request. CF_API_KEY is the Cloudflare account id and
// CF_WORKER_AI_KEY is the gateway token. The SDK sends no x-api-key or
// authorization header: the gateway adds the stored key. The baseURL
// parameter exists so a test can point the client at a stub server.
export function createGatewayClient(
  env: Pick<Env, "CF_API_KEY" | "CF_WORKER_AI_KEY">,
  baseURL: string = gatewayBaseURL(env.CF_API_KEY),
): Anthropic {
  return new Anthropic({
    apiKey: null,
    authToken: null,
    maxRetries: 0,
    baseURL,
    defaultHeaders: {
      "x-api-key": null,
      "cf-aig-authorization": `Bearer ${env.CF_WORKER_AI_KEY}`,
      "cf-aig-byok-alias": KEY_ALIAS,
    },
  });
}
