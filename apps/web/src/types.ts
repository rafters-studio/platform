import type { Capabilities } from "./lib/capabilities";
import type { Logger } from "./lib/logging/logger";

export type ApiKeyContext = {
  id: string;
  referenceId: string;
  name: string | null;
  permissions: string[];
};

export type HonoEnv = {
  Bindings: Env;
  Variables: {
    user: Record<string, unknown> | null;
    session: Record<string, unknown> | null;
    capabilities: Capabilities | null;
    apiKey: ApiKeyContext | null;
    logger: Logger;
  };
};
