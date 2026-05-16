import { createMiddleware } from "hono/factory";
import type { HonoEnv } from "../../types";
import { createLogger } from "./logger";

export const requestLogger = createMiddleware<HonoEnv>(async (c, next) => {
  const start = Date.now();
  const log = createLogger({ method: c.req.method, path: c.req.path });

  c.set("logger", log);

  await next();

  log.info("request", {
    status: c.res.status,
    durationMs: Date.now() - start,
  });
});
