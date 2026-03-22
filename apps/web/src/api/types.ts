import type { Logger } from "../lib/logging/logger";

export type HonoEnv = {
  Bindings: Env;
  Variables: {
    user: Record<string, unknown> | null;
    session: Record<string, unknown> | null;
    logger: Logger;
  };
};
