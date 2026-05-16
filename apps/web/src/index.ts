import app from "./app";
import { runCalibrationRoll } from "./cron/calibration-roll";
import { runOrphanSweep } from "./cron/orphan-sweep";

export default {
  fetch: app.fetch,
  scheduled: async (event, env) => {
    switch (event.cron) {
      case "0 * * * *":
        await runOrphanSweep(env.DB);
        break;
      case "0 2 * * *":
        await runCalibrationRoll(env.DB);
        break;
    }
  },
} satisfies ExportedHandler<Env>;
