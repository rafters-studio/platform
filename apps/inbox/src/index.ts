import { ingestInboundEmail } from "./lib/inbound";

export default {
  email: async (message, env) => {
    try {
      const result = await ingestInboundEmail(message, env);
      console.log("inbound email", {
        status: result.status,
        messageId: result.messageId,
        from: message.from,
        to: message.to,
      });
    } catch (err) {
      console.error("inbound email failed", {
        error: err instanceof Error ? err.message : String(err),
        from: message.from,
        to: message.to,
      });
      throw err;
    }
  },
} satisfies ExportedHandler<Env>;
