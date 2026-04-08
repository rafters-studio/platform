import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { zodSearchValidator } from "@tanstack/router-zod-adapter";

const loginSearchSchema = z.object({
  returnUrl: z.string().optional(),
  error: z.enum(["oauth_denied", "oauth_failed", "session_expired"]).optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: zodSearchValidator(loginSearchSchema),
  component: LoginRedirect,
});

function LoginRedirect() {
  const { returnUrl } = Route.useSearch();
  const callbackUrl = returnUrl ?? "/ctrl";

  // Redirect to platform's better-auth GitHub OAuth flow
  window.location.href = `/api/auth/sign-in/github?callbackURL=${encodeURIComponent(callbackUrl)}`;

  return (
    <div>
      <p>Redirecting to sign in...</p>
    </div>
  );
}
