import { OpenAPIHono } from "@hono/zod-openapi";
import type { HonoEnv } from "../../types";
import { loadSession, requireAuth } from "../../middleware/auth";

const ctrl = new OpenAPIHono<HonoEnv>();

ctrl.use("*", loadSession);
ctrl.use("*", requireAuth);

ctrl.get("/health", (c) => c.json({ status: "ok" }));

export function registerCtrlRoutes(app: OpenAPIHono<HonoEnv>) {
  app.route("/ctrl", ctrl);
}
