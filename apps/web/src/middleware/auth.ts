import { createMiddleware } from "hono/factory";
import { createAuth } from "../auth";
import type { HonoEnv } from "../types";
import {
  type Capabilities,
  createSignedCapabilities,
  readCapabilities,
  setCapabilitiesCookie,
} from "../lib/capabilities";
import { createDb } from "../db/client";
import { member } from "../db/schema/auth";
import { eq, and } from "drizzle-orm";

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

    // Try reading capabilities from cookie first (avoids D1 query)
    const existing = await readCapabilities(c.req.header("cookie"), c.env.BETTER_AUTH_SECRET);

    if (existing && existing.userId === data.user.id) {
      c.set("capabilities", existing);
    } else {
      // Build capabilities from D1 and set cookie for next request
      const userId = data.user.id as string;
      const activeOrgId = (data.session.activeOrganizationId as string) ?? null;
      const isAdmin = (data.user.role as string) === "admin";

      let orgRole: string | null = null;
      if (activeOrgId) {
        const db = createDb(c.env.DB);
        const membership = await db
          .select({ role: member.role })
          .from(member)
          .where(and(eq(member.userId, userId), eq(member.organizationId, activeOrgId)))
          .get();
        orgRole = membership?.role ?? null;
      }

      const capabilities: Capabilities = {
        userId,
        orgId: activeOrgId,
        role: orgRole,
        isAdmin,
        iat: Date.now(),
      };

      const signed = await createSignedCapabilities(capabilities, c.env.BETTER_AUTH_SECRET);
      setCapabilitiesCookie(c.res.headers, signed);
      c.set("capabilities", capabilities);
    }
  } else {
    c.set("user", null);
    c.set("session", null);
    c.set("capabilities", null);
  }

  await next();
});

export const requireAuth = createMiddleware<HonoEnv>(async (c, next) => {
  if (!c.var.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

export const requireOrgMember = createMiddleware<HonoEnv>(async (c, next) => {
  if (!c.var.capabilities?.orgId) {
    return c.json({ error: "No active organization" }, 403);
  }
  await next();
});

export const requireOrgRole = (...roles: string[]) =>
  createMiddleware<HonoEnv>(async (c, next) => {
    const cap = c.var.capabilities;
    if (!cap?.role || !roles.includes(cap.role)) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }
    await next();
  });

export const requireAdmin = createMiddleware<HonoEnv>(async (c, next) => {
  if (!c.var.capabilities?.isAdmin) {
    return c.json({ error: "Admin access required" }, 403);
  }
  await next();
});
