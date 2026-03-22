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

function buildAuth(env: Env) {
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
      get: (key) => env.SESSION_KV.get(key),
      set: (key, value, ttl) =>
        env.SESSION_KV.put(key, value, {
          expirationTtl: Math.max(ttl ?? 604800, 60),
        }),
      delete: (key) => env.SESSION_KV.delete(key),
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
      emailOTP({
        sendVerificationOTP: async ({ email, otp, type }) => {
          // TODO: Wire @rafters/better-auth-resend when mail repo ships
          console.log(`[OTP] ${type} code ${otp} -> ${email}`);
        },
      }),
      passkey({
        rpID: new URL(env.BETTER_AUTH_URL).hostname,
        rpName: "Rafters Studio",
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

export type Auth = ReturnType<typeof buildAuth>;

const authCache = new WeakMap<D1Database, Auth>();

export function createAuth(env: Env) {
  const cached = authCache.get(env.AUTH_DB);
  if (cached) return cached;

  const auth = buildAuth(env);
  authCache.set(env.AUTH_DB, auth);
  return auth;
}
