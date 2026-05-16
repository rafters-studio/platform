import { expect, test } from "@playwright/test";

// MVP post-deploy smoke. Targets a real deployed worker via SMOKE_BASE_URL
// (default https://rafters.studio). Tests tagged @cost incur Anthropic /
// Resend / Polar charges and are skipped by default; run them with:
//   pnpm test:e2e --grep @cost

test.describe("/api/health", () => {
  test("returns 200 OK", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

test.describe("/api/color/:oklch", () => {
  test("path validation rejects malformed OKLCH", async ({ request }) => {
    const res = await request.get("/api/color/not-an-oklch");
    expect(res.status()).toBe(400);
  });

  test("adhoc=true returns full ColorValue (math only, no AI)", async ({ request }) => {
    const res = await request.get("/api/color/0.700-0.150-260?adhoc=true");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      status: string;
      color: { name: string; scale: unknown[]; harmonies: Record<string, unknown> };
    };
    expect(body.status).toBe("found");
    expect(body.color.name).toBeTruthy();
    expect(body.color.scale).toHaveLength(11);
    expect(body.color.harmonies).toMatchObject({
      complementary: expect.any(Object),
      triadic: expect.any(Array),
    });
  });

  test("@cost sync=true generates AI intelligence with a label", async ({ request }) => {
    const oklch = `0.5${Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0")}-0.150-260`;
    const res = await request.get(`/api/color/${oklch}?sync=true`, { timeout: 60_000 });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      status: string;
      color: { intelligence?: { label: string; reasoning: string } };
    };
    expect(body.status).toBe("found");
    expect(body.color.intelligence?.label).toBeTruthy();
    expect(body.color.intelligence?.reasoning).toBeTruthy();
  });
});

test.describe("/api/auth", () => {
  test("github sign-in redirects to github.com", async ({ request }) => {
    const res = await request.get("/api/auth/sign-in/github?callbackURL=/", {
      maxRedirects: 0,
    });
    expect([302, 303, 307]).toContain(res.status());
    const location = res.headers()["location"];
    expect(location).toMatch(/^https:\/\/github\.com\//);
  });

  test("@cost otp send-verification accepts a valid email", async ({ request }) => {
    const res = await request.post("/api/auth/email-otp/send-verification-otp", {
      data: { email: `smoke+${Date.now()}@rafters.studio`, type: "sign-in" },
    });
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe("/api/auth/polar/webhook", () => {
  test("rejects requests with invalid signature", async ({ request }) => {
    const res = await request.post("/api/auth/polar/webhook", {
      headers: {
        "webhook-id": "smoke-test",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
        "webhook-signature": "v1,definitely-not-a-real-signature",
        "content-type": "application/json",
      },
      data: { type: "order.created", data: { id: "ord_smoke" } },
    });
    expect([400, 401, 403]).toContain(res.status());
  });
});

test.describe("inbound mail (CF Email Routing)", () => {
  test.skip(
    true,
    "Triggered manually via CF Email Routing dashboard test send. " +
      "Verify a row appears in D1 inbox_message + a blob at messages/<sha256>/raw.eml in R2.",
  );
});
