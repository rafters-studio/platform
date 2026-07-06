import type { Hono } from "hono";
import { z } from "zod";
import type { HonoEnv } from "../types";

export const colorSeedMessageSchema = z.object({
  oklch: z.object({ l: z.number(), c: z.number(), h: z.number() }),
  requestId: z.string().optional(),
  timestamp: z.number().optional(),
});

export type ColorSeedMessage = z.infer<typeof colorSeedMessageSchema>;

// Mirrors the route's L.LLL-C.CCC-H path contract in routes/color.ts.
export function colorIntelPath(oklch: ColorSeedMessage["oklch"]): string {
  return `${oklch.l.toFixed(3)}-${oklch.c.toFixed(3)}-${Math.round(oklch.h)}`;
}

export function internalColorRequest(message: ColorSeedMessage): Request {
  return new Request(`http://internal/api/color/${colorIntelPath(message.oklch)}?sync=true`);
}

// 200 = generated and persisted; 202 = another writer beat us, equally done.
export function isSuccessStatus(status: number): boolean {
  return status === 200 || status === 202;
}

const CONCURRENCY_LIMIT = 10;

async function processSingleMessage(
  message: Message<unknown>,
  env: Env,
  app: Hono<HonoEnv>,
): Promise<void> {
  const parsed = colorSeedMessageSchema.safeParse(message.body);
  if (!parsed.success) {
    // Malformed payloads can never succeed; retrying them only burns spend.
    message.ack();
    return;
  }

  try {
    const response = await app.fetch(internalColorRequest(parsed.data), env);
    if (isSuccessStatus(response.status)) {
      message.ack();
    } else {
      message.retry();
    }
  } catch {
    message.retry();
  }
}

export async function processColorSeedBatch(
  batch: MessageBatch<unknown>,
  env: Env,
  app: Hono<HonoEnv>,
): Promise<void> {
  for (let i = 0; i < batch.messages.length; i += CONCURRENCY_LIMIT) {
    const chunk = batch.messages.slice(i, i + CONCURRENCY_LIMIT);
    await Promise.allSettled(chunk.map((message) => processSingleMessage(message, env, app)));
  }
}
