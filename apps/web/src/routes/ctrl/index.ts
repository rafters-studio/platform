import { Hono } from "hono";
import type { HonoEnv } from "../../types";

const ctrlRoutes = new Hono<HonoEnv>();

ctrlRoutes.get("/health", (c) => c.json({ status: "ok" }));

export { ctrlRoutes };
