import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { createAuth } from "./api/auth";

export const onRequest = defineMiddleware(async (context, next) => {
  if (!context.url.pathname.startsWith("/ctrl")) {
    return next();
  }

  const auth = createAuth(env as Env);
  const response = await auth.api.getSession({
    asResponse: true,
    headers: context.request.headers,
  });

  if (!response.ok) {
    return context.redirect("/api/auth/sign-in/github");
  }

  return next();
});
