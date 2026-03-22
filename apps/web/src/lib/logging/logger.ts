import { uuidv7 } from "uuidv7";
import { redactPII } from "./pii-filter";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
}

function emit(level: LogLevel, message: string, ctx?: LogContext, data?: Record<string, unknown>) {
  const raw = {
    ts: Date.now(),
    level,
    msg: message,
    ...ctx,
    ...data,
  };

  const entry = redactPII(raw);
  const output = JSON.stringify(entry);

  switch (level) {
    case "debug":
    case "info":
      console.log(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "error":
      console.error(output);
      break;
  }
}

export function createLogger(ctx?: LogContext) {
  const requestId = ctx?.requestId ?? uuidv7();
  const context: LogContext = { ...ctx, requestId };

  return {
    requestId,
    setUser(userId: string) {
      context.userId = userId;
    },
    debug(msg: string, data?: Record<string, unknown>) {
      emit("debug", msg, context, data);
    },
    info(msg: string, data?: Record<string, unknown>) {
      emit("info", msg, context, data);
    },
    warn(msg: string, data?: Record<string, unknown>) {
      emit("warn", msg, context, data);
    },
    error(msg: string, err?: unknown, data?: Record<string, unknown>) {
      const errData =
        err instanceof Error
          ? { error: err.message, stack: err.stack }
          : err
            ? { error: String(err) }
            : undefined;
      emit("error", msg, context, { ...data, ...errData });
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
