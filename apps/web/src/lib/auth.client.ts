import { createAuthClient } from "better-auth/react";
import {
	adminClient,
	organizationClient,
} from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { polarClient } from "@polar-sh/better-auth/client";

export const authClient = createAuthClient({
	baseURL: "/api/auth",
	plugins: [
		passkeyClient(),
		polarClient(),
		adminClient(),
		organizationClient(),
	],
});
