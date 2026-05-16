import app from "./app";
import { runCalibrationRoll } from "./cron/calibration-roll";
import { runOrphanSweep } from "./cron/orphan-sweep";
import { createLogger } from "./lib/logging/logger";

type CronHandler = (db: D1Database) => Promise<number | void>;

const cronHandlers: Record<string, { name: string; run: CronHandler }> = {
  "0 * * * *": { name: "orphan-sweep", run: runOrphanSweep },
  "0 2 * * *": { name: "calibration-roll", run: runCalibrationRoll },
};

export default {
  fetch: app.fetch,
  scheduled: async (event, env) => {
    const log = createLogger({ method: "CRON", path: event.cron });
    const handler = cronHandlers[event.cron];

    if (!handler) {
      log.error("unhandled cron", undefined, { cron: event.cron });
      return;
    }

    const start = Date.now();
    try {
      const result = await handler.run(env.DB);
      log.info(`${handler.name} complete`, {
        result: result ?? null,
        durationMs: Date.now() - start,
      });
    } catch (err) {
      log.error(`${handler.name} failed`, err, {
        durationMs: Date.now() - start,
      });
      throw err;
    }
  },
} satisfies ExportedHandler<Env>;

export { cronHandlers };
