import { Hono } from "hono";
import { createAuth } from "../auth";

const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.on(["GET", "POST", "PUT", "PATCH", "DELETE"], "/*", (c) => {
	return createAuth(c.env).handler(c.req.raw);
});

export { authRoutes };
