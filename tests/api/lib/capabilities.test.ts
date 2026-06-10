import { describe, expect, it } from "vitest";
import {
  type Capabilities,
  capabilitiesSchema,
  createSignedCapabilities,
  readCapabilities,
  setCapabilitiesCookie,
} from "../../../apps/web/src/lib/capabilities";

const SECRET = "test-secret-which-is-long-enough";

function caps(overrides: Partial<Capabilities> = {}): Capabilities {
  return {
    userId: "0197aaaa-0000-7000-8000-000000000001",
    orgId: "0197aaaa-0000-7000-8000-000000000002",
    role: "member",
    isAdmin: false,
    iat: Date.now(),
    ...overrides,
  };
}

async function cookieHeaderFor(c: Capabilities, secret = SECRET): Promise<string> {
  const signed = await createSignedCapabilities(c, secret);
  return `rafters_cap=${signed}`;
}

describe("capabilities cookie", () => {
  it("round-trips a signed payload through readCapabilities", async () => {
    const original = caps();
    const result = await readCapabilities(await cookieHeaderFor(original), SECRET);
    expect(result).toEqual(original);
  });

  it("returns null when the cookie header is missing", async () => {
    expect(await readCapabilities(undefined, SECRET)).toBeNull();
  });

  it("returns null when the rafters_cap cookie is absent from the header", async () => {
    expect(await readCapabilities("other=value; session=abc", SECRET)).toBeNull();
  });

  it("rejects a signature produced with a different secret", async () => {
    const header = await cookieHeaderFor(caps(), "a-completely-different-secret");
    expect(await readCapabilities(header, SECRET)).toBeNull();
  });

  it("rejects a tampered payload", async () => {
    const signed = await createSignedCapabilities(caps({ isAdmin: false }), SECRET);
    const lastDot = signed.lastIndexOf(".");
    const forgedPayload = btoa(JSON.stringify(caps({ isAdmin: true })));
    const forged = `${forgedPayload}${signed.slice(lastDot)}`;
    expect(await readCapabilities(`rafters_cap=${forged}`, SECRET)).toBeNull();
  });

  it("rejects a tampered signature", async () => {
    const signed = await createSignedCapabilities(caps(), SECRET);
    const flipped = signed.slice(0, -2) + (signed.endsWith("00") ? "11" : "00");
    expect(await readCapabilities(`rafters_cap=${flipped}`, SECRET)).toBeNull();
  });

  it("rejects a cookie with no signature separator", async () => {
    expect(await readCapabilities("rafters_cap=not-a-signed-value", SECRET)).toBeNull();
  });

  it("expires payloads older than five minutes", async () => {
    const stale = caps({ iat: Date.now() - 301_000 });
    const header = await cookieHeaderFor(stale);
    expect(await readCapabilities(header, SECRET)).toBeNull();
  });

  it("accepts payloads just inside the five minute window", async () => {
    const fresh = caps({ iat: Date.now() - 290_000 });
    const header = await cookieHeaderFor(fresh);
    expect(await readCapabilities(header, SECRET)).not.toBeNull();
  });

  it("rejects a validly signed payload that fails the schema", async () => {
    const malformed = btoa(JSON.stringify({ userId: 123, iat: "not-a-number" }));
    // Sign the malformed payload with the real secret via the public API shape:
    // create a valid signature for it by signing through createSignedCapabilities
    // is impossible (schema-typed input), so HMAC it the same way the module does.
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(malformed));
    const sigHex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
    const result = await readCapabilities(`rafters_cap=${malformed}.${sigHex}`, SECRET);
    expect(result).toBeNull();
  });

  it("sets an HttpOnly, Secure, SameSite=Lax cookie with a 300s max age", () => {
    const headers = new Headers();
    setCapabilitiesCookie(headers, "signed-value");
    const cookie = headers.get("set-cookie") ?? "";
    expect(cookie).toContain("rafters_cap=signed-value");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=300");
  });

  it("schema rejects payloads missing required fields", () => {
    expect(capabilitiesSchema.safeParse({ userId: "u" }).success).toBe(false);
    expect(capabilitiesSchema.safeParse(caps()).success).toBe(true);
  });
});
