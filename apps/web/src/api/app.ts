// NOT MOUNTED: Astro 6 dev drops routes when importing a Hono app instance.
// The catch-all at pages/api/[...slug].ts inlines its own app instead.
// This file is the target architecture for when that bug is resolved.
import { Hono } from "hono";
import { loadSession } from "./middleware/auth";
import { authRoutes } from "./routes/auth";

const app = new Hono<{ Bindings: Env }>()
	.get("/health", (c) => c.json({ status: "ok" }))
	.route("/auth", authRoutes)
	.use("/*", loadSession);

export type AppType = typeof app;
export default app;
