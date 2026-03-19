import { Hono } from "hono";

export type Env = {
	Bindings: Record<string, unknown>;
};

const app = new Hono<Env>();

app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
