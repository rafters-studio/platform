import { Hono } from "hono";
import { loadSession } from "./middleware/auth";
import { authRoutes } from "./routes/auth";

const app = new Hono<{ Bindings: Env }>()
	.get("/health", (c) => c.json({ status: "ok" }))
	.route("/auth", authRoutes)
	.use("/*", loadSession);

export type AppType = typeof app;
export default app;
