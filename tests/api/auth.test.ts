import { resendOTP } from "@rafters/better-auth-resend";
import { describe, expect, it } from "vitest";

describe("resendOTP wiring", () => {
  it("returns a (email, otp) -> Promise<void> function from valid config", () => {
    const send = resendOTP({
      apiKey: "re_test_placeholder",
      fromEmail: "noreply@example.com",
      brandName: "Test",
      expiryMinutes: 10,
      baseUrl: "https://api.resend.com",
    });
    expect(typeof send).toBe("function");
    expect(send.length).toBe(2);
  });

  it("rejects construction when apiKey is empty (Zod validation)", () => {
    expect(() =>
      resendOTP({
        apiKey: "",
        fromEmail: "noreply@example.com",
        brandName: "Test",
        expiryMinutes: 10,
        baseUrl: "https://api.resend.com",
      }),
    ).toThrow();
  });

  it("rejects construction when fromEmail is not an email", () => {
    expect(() =>
      resendOTP({
        apiKey: "re_test_placeholder",
        fromEmail: "not-an-email",
        brandName: "Test",
        expiryMinutes: 10,
        baseUrl: "https://api.resend.com",
      }),
    ).toThrow();
  });
});
