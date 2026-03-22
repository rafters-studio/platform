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
          // Swap for @rafters/better-auth-resend when mail repo ships
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: env.FROM_EMAIL,
              to: email,
              subject: `Rafters Studio ${type} code: ${otp}`,
              html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px"><h2>Verification Code</h2><p style="font-size:32px;font-weight:bold;letter-spacing:4px;font-family:monospace;margin:24px 0">${otp}</p><p>This code expires in 10 minutes.</p><p style="color:#666;font-size:14px">If you did not request this code, ignore this email.</p></div>`,
            }),
          });
          if (!res.ok) {
            console.error(`[OTP] Failed to send ${type} code to ${email}: ${res.status}`);
          }
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
