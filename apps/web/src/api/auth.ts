import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { emailOTP } from "better-auth/plugins/email-otp";
import { organization } from "better-auth/plugins/organization";
import { passkey } from "@better-auth/passkey";
import { checkout, polar, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { drizzle } from "drizzle-orm/d1";
import { uuidv7 } from "uuidv7";

export function createAuth(env: Env) {
	const db = drizzle(env.AUTH_DB);

	const polarClient = new Polar({
		accessToken: env.POLAR_ACCESS_TOKEN,
	});

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "sqlite",
		}),
		advanced: {
			database: {
				generateId: () => uuidv7(),
				transaction: false,
			},
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		basePath: "/api/auth",
		secondaryStorage: {
			get: async (key) => await env.SESSION_KV.get(key),
			set: async (key, value, ttl) => {
				await env.SESSION_KV.put(key, value, {
					expirationTtl: Math.max(ttl ?? 604800, 60),
				});
			},
			delete: async (key) => await env.SESSION_KV.delete(key),
		},
		session: {
			cookieCache: {
				enabled: true,
				maxAge: 300,
			},
			expiresIn: 60 * 60 * 24 * 7,
			updateAge: 60 * 60 * 24,
		},
		emailAndPassword: { enabled: false },
		socialProviders: {
			github: {
				clientId: env.GITHUB_CLIENT_ID,
				clientSecret: env.GITHUB_CLIENT_SECRET,
			},
		},
		plugins: [
			passkey({
				rpID: "rafters.studio",
				rpName: "Rafters Studio",
			}),
			emailOTP({
				sendVerificationOTP: async () => {
					// TODO: wire to email provider (Resend, SES, etc.)
					throw new Error("OTP email delivery not implemented");
				},
			}),
			polar({
				client: polarClient,
				createCustomerOnSignUp: true,
				use: [
					checkout(),
					webhooks({
						secret: env.POLAR_WEBHOOK_SECRET,
					}),
				],
			}),
			admin(),
			organization(),
		],
	});
}

export type Auth = ReturnType<typeof createAuth>;
