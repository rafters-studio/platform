import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { getAuth } from "./auth";
import { registerColorRoutes } from "./routes/color";

export type Env = {
	Bindings: {
		AUTH_DB: D1Database;
		SNAPSHOTS: R2Bucket;
	};
};

const app = new OpenAPIHono<Env>();

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Mount better-auth at /auth/*
app.on(["GET", "POST"], "/auth/**", (c) => {
	const auth = getAuth(c.env.AUTH_DB);
	return auth.handler(c.req.raw);
});

// Color intelligence
registerColorRoutes(app);

// OpenAPI spec
app.doc("/spec", {
	openapi: "3.1.0",
	info: {
		title: "Rafters Studio API",
		version: "0.1.0",
		description: "Design intelligence protocol API",
	},
});

// API reference docs
app.get(
	"/docs",
	apiReference({
		spec: { url: "/api/spec" },
		theme: "kepler",
		pageTitle: "Rafters Studio API",
	}),
);

export default app;
