import { ingestInboundEmail } from "./lib/inbound";

async function storeFailedEmail(
  env: Env,
  rawBuffer: ArrayBuffer,
  message: ForwardableEmailMessage,
  error: unknown,
): Promise<void> {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const key = `failed/${year}/${month}/${timestamp}.eml`;
  await env.rafters_email.put(key, rawBuffer, {
    httpMetadata: { contentType: "message/rfc822" },
    customMetadata: {
      from: message.from,
      to: message.to,
      storedAt: now.toISOString(),
      error: String(error),
      reason: "processing-failed",
    },
  });
}

export default {
  email: async (message, env) => {
    let rawBuffer: ArrayBuffer;
    try {
      rawBuffer = await new Response(message.raw).arrayBuffer();
    } catch (streamErr) {
      // Cannot even read the message. Log and ack -- never let CF retry indefinitely.
      console.error("inbound stream read failed", {
        error: streamErr instanceof Error ? streamErr.message : String(streamErr),
        from: message.from,
        to: message.to,
      });
      return;
    }

    try {
      const result = await ingestInboundEmail(message, env, rawBuffer);
      console.log("inbound email", {
        status: result.status,
        messageId: result.messageId,
        from: message.from,
        to: message.to,
      });
    } catch (err) {
      console.error("inbound email processing failed -- storing for review", {
        error: err instanceof Error ? err.message : String(err),
        from: message.from,
        to: message.to,
      });
      try {
        await storeFailedEmail(env, rawBuffer, message, err);
      } catch (storageErr) {
        console.error("failed-email store failed", {
          error: storageErr instanceof Error ? storageErr.message : String(storageErr),
        });
      }
      // Never rethrow. CF acks. Recovery happens offline via the failed/ R2 prefix.
    }
  },
} satisfies ExportedHandler<Env>;
