export { default } from "@astrojs/cloudflare/entrypoints/server";

import { runOrphanSweep } from "./api/cron/orphan-sweep";
import { runCalibrationRoll } from "./api/cron/calibration-roll";

export const scheduled: ExportedHandlerScheduledHandler<Env> = async (event, env) => {
  switch (event.cron) {
    case "0 * * * *":
      await runOrphanSweep(env.DB);
      break;
    case "0 2 * * *":
      await runCalibrationRoll(env.DB);
      break;
  }
};
