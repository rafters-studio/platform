import { describe, expect, it } from "vitest";
import { redactPII } from "../../../../apps/web/src/lib/logging/pii-filter";

describe("redactPII key-based redaction", () => {
  it.each([
    "email",
    "password",
    "secret",
    "token",
    "accessToken",
    "refresh_token",
    "apiKey",
    "authorization",
    "cookie",
    "set-cookie",
    "ip",
    "x-forwarded-for",
    "banReason",
  ])("redacts the %s key wholesale", (key) => {
    const result = redactPII({ [key]: "sensitive-value" });
    expect(result[key]).toBe("[REDACTED]");
  });

  it("redacts PII keys in nested objects", () => {
    const result = redactPII({ request: { headers: { authorization: "Bearer abc" } } });
    expect(result).toEqual({ request: { headers: { authorization: "[REDACTED]" } } });
  });

  it("leaves non-PII keys and values untouched", () => {
    const result = redactPII({ method: "POST", path: "/api/health", status: 200 });
    expect(result).toEqual({ method: "POST", path: "/api/health", status: 200 });
  });
});

describe("redactPII pattern-based redaction in string values", () => {
  it("redacts email addresses", () => {
    const result = redactPII({ message: "contact sean.silvius@example.com for access" });
    expect(result.message).toBe("contact [REDACTED_EMAIL] for access");
  });

  it("redacts IPv4 addresses", () => {
    const result = redactPII({ message: "request from 203.0.113.42 denied" });
    expect(result.message).toBe("request from [REDACTED_IP] denied");
  });

  it("redacts IPv6 addresses", () => {
    const result = redactPII({
      message: "client 2001:0db8:85a3:0000:0000:8a2e:0370:7334 connected",
    });
    expect(result.message).toBe("client [REDACTED_IP] connected");
  });

  it("redacts JWTs", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9P";
    const result = redactPII({ message: `token ${jwt} rejected` });
    expect(result.message).toBe("token [REDACTED_JWT] rejected");
  });

  it("redacts bearer tokens", () => {
    const result = redactPII({ message: "header was Bearer abc123def456" });
    expect(result.message).toBe("header was Bearer [REDACTED]");
  });

  it("redacts vendor API keys by prefix", () => {
    const result = redactPII({
      message: "used re_AbCdEfGh1234567890 and sk_live_0123456789abcdef",
    });
    expect(result.message).not.toContain("re_AbCdEfGh1234567890");
    expect(result.message).not.toContain("sk_live_0123456789abcdef");
    expect(result.message).toContain("[REDACTED_KEY]");
  });

  it("redacts phone numbers", () => {
    const result = redactPII({ message: "call +1 555-867-5309 now" });
    expect(result.message).toBe("call [REDACTED_PHONE] now");
  });

  it("redacts strings inside arrays", () => {
    const result = redactPII({ recipients: ["a@example.com", "plain text"] });
    expect(result.recipients).toEqual(["[REDACTED_EMAIL]", "plain text"]);
  });

  it("preserves non-string primitives", () => {
    const result = redactPII({ count: 3, ok: true, nothing: null });
    expect(result).toEqual({ count: 3, ok: true, nothing: null });
  });

  it("handles multiple PII types in a single string", () => {
    const result = redactPII({
      message: "user a@b.co from 10.0.0.1 sent Bearer xyz789token",
    });
    expect(result.message).toBe("user [REDACTED_EMAIL] from [REDACTED_IP] sent Bearer [REDACTED]");
  });
});
