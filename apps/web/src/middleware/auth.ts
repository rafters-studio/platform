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

// Authorization: Bearer <api-key> -- service-to-service auth.
// Verifies via better-auth api-key plugin, attaches ApiKeyContext to c.var.apiKey on success.
// requiredPermissions: bare strings the key must include (e.g. "uncertainty:emit").
// Falls through to next() if a user session is present -- user sessions skip the api-key path.
export const requireApiKeyOrSession = (...requiredPermissions: string[]) =>
  createMiddleware<HonoEnv>(async (c, next) => {
    if (c.var.user) {
      await next();
      return;
    }

    const authHeader = c.req.header("Authorization");
    const headerKey = c.req.header("x-api-key");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const key = bearer ?? headerKey;
    if (!key) return c.json({ error: "Unauthorized" }, 401);

    const auth = createAuth(c.env);
    const result = await auth.api.verifyApiKey({ body: { key, permissions: undefined } });
    if (!result.valid || !result.key) {
      return c.json({ error: "Invalid api key" }, 401);
    }

    // result.key.permissions arrives as Record<resource, action[]> from better-auth.
    // We flatten to "resource:action" strings for scope checks.
    const permissions: string[] = [];
    const raw = result.key.permissions;
    if (raw && typeof raw === "object") {
      for (const [resource, actions] of Object.entries(raw)) {
        if (Array.isArray(actions)) {
          for (const action of actions) {
            permissions.push(`${resource}:${action}`);
          }
        }
      }
    }
    for (const required of requiredPermissions) {
      if (!permissions.includes(required)) {
        return c.json({ error: "Insufficient scope", required }, 403);
      }
    }

    c.set("apiKey", {
      id: result.key.id,
      referenceId: result.key.referenceId,
      name: result.key.name ?? null,
      permissions,
    });
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
