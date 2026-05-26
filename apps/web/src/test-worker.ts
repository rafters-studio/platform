import { Hono } from "hono";
import { colorRoutes } from "./routes/color";
import { uncertaintyRoutes } from "./routes/uncertainty";
import type { HonoEnv } from "./types";

const app = new Hono<HonoEnv>()
  .basePath("/api")
  .route("/color", colorRoutes)
  .route("/uncertainty", uncertaintyRoutes);

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;
