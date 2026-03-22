import { z } from "zod";

export const capabilitiesSchema = z.object({
  userId: z.string(),
  orgId: z.string().nullable(),
  role: z.string().nullable(),
  isAdmin: z.boolean(),
  iat: z.number(),
});

export type Capabilities = z.infer<typeof capabilitiesSchema>;

const COOKIE_NAME = "rafters_cap";
const MAX_AGE = 300; // 5 minutes, matches session cookieCache

function encodePayload(payload: Capabilities): string {
  return btoa(JSON.stringify(payload));
}

function decodePayload(encoded: string): Capabilities | null {
  try {
    const json = JSON.parse(atob(encoded));
    return capabilitiesSchema.parse(json);
  } catch {
    return null;
  }
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const sigHex = [...new Uint8Array(signature)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${payload}.${sigHex}`;
}

async function verify(cookie: string, secret: string): Promise<Capabilities | null> {
  const lastDot = cookie.lastIndexOf(".");
  if (lastDot === -1) return null;

  const payload = cookie.slice(0, lastDot);
  const sigHex = cookie.slice(lastDot + 1);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)?.map((h) => Number.parseInt(h, 16)) ?? []);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(payload),
  );
  if (!valid) return null;

  const capabilities = decodePayload(payload);
  if (!capabilities) return null;

  const age = Date.now() - capabilities.iat;
  if (age > MAX_AGE * 1000) return null;

  return capabilities;
}

export function setCapabilitiesCookie(headers: Headers, signedValue: string): void {
  headers.append(
    "set-cookie",
    `${COOKIE_NAME}=${signedValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`,
  );
}

export async function createSignedCapabilities(
  capabilities: Capabilities,
  secret: string,
): Promise<string> {
  const payload = encodePayload(capabilities);
  return sign(payload, secret);
}

export async function readCapabilities(
  cookieHeader: string | undefined,
  secret: string,
): Promise<Capabilities | null> {
  if (!cookieHeader) return null;

  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match?.[1]) return null;

  return verify(match[1], secret);
}
