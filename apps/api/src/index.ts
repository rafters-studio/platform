import { Hono } from "hono";
import { colorRoutes } from "./color/route";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.get("/health", (c) => c.json({ ok: true }));
app.route("/color", colorRoutes);

export default app;
