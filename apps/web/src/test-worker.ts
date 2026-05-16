import { Hono } from "hono";
import { colorRoutes } from "./routes/color";
import type { HonoEnv } from "./types";

const app = new Hono<HonoEnv>().basePath("/api").route("/color", colorRoutes);

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;
