import { createAuthClient } from "better-auth/react";
import { adminClient, emailOTPClient, organizationClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { polarClient, PolarEmbedCheckout } from "@polar-sh/better-auth/client";

export const authClient = createAuthClient({
  baseURL: "/api/auth",
  plugins: [emailOTPClient(), passkeyClient(), polarClient(), adminClient(), organizationClient()],
});

export { PolarEmbedCheckout };
