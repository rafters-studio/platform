import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { emailOTP } from "better-auth/plugins/email-otp";
import { organization } from "better-auth/plugins/organization";
import { passkey } from "@better-auth/passkey";
import { checkout, polar, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { resendOTP } from "@rafters/better-auth-resend";
import { ledgerPlugin } from "@rafters/ledger/better-auth";
import { uuidv7 } from "uuidv7";
import { createDb } from "./db/client";
import { auditLog } from "./db/schema/audit";
import { writePolarAudit } from "./lib/audit/polar-webhook";

function buildAuth(env: Env) {
  const db = createDb(env.DB);
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
      get: (key) => env.rafters_session.get(key),
      set: (key, value, ttl) =>
        env.rafters_session.put(key, value, {
          expirationTtl: Math.max(ttl ?? 604800, 60),
        }),
      delete: (key) => env.rafters_session.delete(key),
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
        sendVerificationOTP: (() => {
          const send = resendOTP({
            apiKey: env.RESEND_API_KEY,
            fromEmail: env.FROM_EMAIL,
            brandName: "Rafters Studio",
            expiryMinutes: 10,
            baseUrl: "https://api.resend.com",
          });
          return ({ email, otp }) => send(email, otp);
        })(),
      }),
      ledgerPlugin({
        writeAuditEntry: async (entry) => {
          await db.insert(auditLog).values({
            ...entry,
            oldData: entry.oldData ? JSON.stringify(entry.oldData) : null,
            newData: entry.newData ? JSON.stringify(entry.newData) : null,
          });
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
            onPayload: async (payload) => {
              await writePolarAudit(db, payload);
            },
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
  const cached = authCache.get(env.DB);
  if (cached) return cached;

  const auth = buildAuth(env);
  authCache.set(env.DB, auth);
  return auth;
}
