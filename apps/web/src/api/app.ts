// NOT MOUNTED: Astro 6 dev drops routes when importing a Hono app instance.
// The catch-all at pages/api/[...slug].ts inlines its own app instead.
// This file is the source of truth for AppType -- ctrl and other apps import
// this type to get a fully typed hono/client.
import { Hono } from "hono";
import { loadSession } from "./middleware/auth";
import { authRoutes } from "./routes/auth";
import { colorRoutes } from "./routes/color";
import { ctrlRoutes } from "./routes/ctrl/index";
import { uncertaintyRoutes } from "./routes/uncertainty";
import type { HonoEnv } from "./types";

const app = new Hono<HonoEnv>()
  .basePath("/api")
  .get("/health", (c) => c.json({ status: "ok" }))
  .route("/auth", authRoutes)
  .use("/*", loadSession)
  .route("/color", colorRoutes)
  .route("/ctrl", ctrlRoutes)
  .route("/uncertainty", uncertaintyRoutes);

export type AppType = typeof app;
export default app;
