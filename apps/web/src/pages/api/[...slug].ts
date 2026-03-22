import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { OpenAPIHono } from "@hono/zod-openapi";
import { createAuth } from "../../api/auth";
import { registerColorRoutes } from "../../api/routes/color";
import { requestLogger } from "../../lib/logging/middleware";
import type { HonoEnv } from "../../api/types";

export const prerender = false;

// Inlined because Astro 6 dev silently drops the route when importing
// a pre-built Hono app instance from a separate module.
const app = new OpenAPIHono<HonoEnv>().basePath("/api");

app.use("*", requestLogger);

app.get("/health", (c) => c.json({ status: "ok" }));

app.on(["GET", "POST", "PUT", "PATCH", "DELETE"], "/auth/*", (c) => {
  return createAuth(c.env).handler(c.req.raw);
});

registerColorRoutes(app);

const handle: APIRoute = (context) => app.fetch(context.request, env);

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
