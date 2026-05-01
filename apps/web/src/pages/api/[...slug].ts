import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { createAuth } from "../../api/auth";
import { colorRoutes } from "../../api/routes/color";
import { ctrlRoutes } from "../../api/routes/ctrl/index";
import { uncertaintyRoutes } from "../../api/routes/uncertainty";
import { loadSession } from "../../api/middleware/auth";
import { requestLogger } from "../../lib/logging/middleware";
import type { HonoEnv } from "../../api/types";

export const prerender = false;

// Inlined because Astro 6 dev silently drops the route when importing
// a pre-built Hono app instance from a separate module.
const app = new Hono<HonoEnv>().basePath("/api");

app.use("*", requestLogger);

app.get("/health", (c) => c.json({ status: "ok" }));

app.on(["GET", "POST", "PUT", "PATCH", "DELETE"], "/auth/*", (c) => {
  return createAuth(c.env).handler(c.req.raw);
});

app.use("/*", loadSession);

app.route("/color", colorRoutes);
app.route("/ctrl", ctrlRoutes);
app.route("/uncertainty", uncertaintyRoutes);

const handle: APIRoute = (context) => app.fetch(context.request, env);

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
