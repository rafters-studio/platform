import { createMiddleware } from "hono/factory";
import { createAuth } from "../auth";
import type { HonoEnv } from "../types";

export const loadSession = createMiddleware<HonoEnv>(async (c, next) => {
	const auth = createAuth(c.env);
	const response = await auth.api.getSession({
		asResponse: true,
		headers: c.req.raw.headers,
	});

	const setCookie = response.headers.get("set-cookie");
	if (setCookie) {
		c.header("set-cookie", setCookie);
	}

	if (response.ok) {
		const data = (await response.json()) as {
			user: Record<string, unknown>;
			session: Record<string, unknown>;
		};
		c.set("user", data.user);
		c.set("session", data.session);
	} else {
		c.set("user", null);
		c.set("session", null);
	}

	await next();
});

export const requireAuth = createMiddleware<HonoEnv>(async (c, next) => {
	if (!c.var.user) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	await next();
});
