import { Hono } from "hono";
import { requestLogger } from "./lib/logging/middleware";
import { loadSession } from "./middleware/auth";
import { authRoutes } from "./routes/auth";
import { colorRoutes } from "./routes/color";
import { ctrlRoutes } from "./routes/ctrl/index";
import { uncertaintyRoutes } from "./routes/uncertainty";
import type { HonoEnv } from "./types";

const app = new Hono<HonoEnv>()
  .basePath("/api")
  .use("*", requestLogger)
  .get("/health", (c) => c.json({ status: "ok" }))
  .route("/auth", authRoutes)
  .use("/*", loadSession)
  .route("/color", colorRoutes)
  .route("/ctrl", ctrlRoutes)
  .route("/uncertainty", uncertaintyRoutes);

export default app;
