const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const IP_V4_PATTERN = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
const IP_V6_PATTERN = /([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}/g;
const PHONE_PATTERN = /\+?\d[\d\s\-().]{7,}\d/g;
const JWT_PATTERN = /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;
const BEARER_PATTERN = /Bearer\s+[a-zA-Z0-9._-]+/gi;
const API_KEY_PATTERN = /(?:re_|sk_|pk_|key_)[a-zA-Z0-9_-]{10,}/g;

const PII_KEYS = new Set([
  "email",
  "name",
  "firstName",
  "first_name",
  "lastName",
  "last_name",
  "phone",
  "address",
  "password",
  "secret",
  "token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "idToken",
  "id_token",
  "apiKey",
  "api_key",
  "authorization",
  "cookie",
  "set-cookie",
  "ip",
  "ipAddress",
  "ip_address",
  "cf-connecting-ip",
  "x-forwarded-for",
  "recoveryEmail",
  "recovery_email",
  "banReason",
  "ban_reason",
]);

function redactString(value: string): string {
  return value
    .replace(JWT_PATTERN, "[REDACTED_JWT]")
    .replace(BEARER_PATTERN, "Bearer [REDACTED]")
    .replace(API_KEY_PATTERN, "[REDACTED_KEY]")
    .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]")
    .replace(IP_V6_PATTERN, "[REDACTED_IP]")
    .replace(IP_V4_PATTERN, "[REDACTED_IP]")
    .replace(PHONE_PATTERN, "[REDACTED_PHONE]");
}

function redactValue(key: string, value: unknown): unknown {
  if (PII_KEYS.has(key)) return "[REDACTED]";

  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((v, i) => redactValue(String(i), v));
  if (value !== null && typeof value === "object")
    return redactObject(value as Record<string, unknown>);

  return value;
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    result[key] = redactValue(key, obj[key]);
  }
  return result;
}

export function redactPII(data: Record<string, unknown>): Record<string, unknown> {
  return redactObject(data);
}
