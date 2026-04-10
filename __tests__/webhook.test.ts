import crypto from "crypto";

function verifyHmacSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  const sig = signature.replace("sha256=", "");
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

describe("Webhook HMAC verification", () => {
  const secret = "test-webhook-secret-32bytes-long!";

  it("should verify a valid HMAC signature", () => {
    const body = JSON.stringify({ name: "Test Lead", email: "test@example.com" });
    const signature =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(body).digest("hex");

    expect(verifyHmacSignature(body, signature, secret)).toBe(true);
  });

  it("should reject an invalid signature", () => {
    const body = JSON.stringify({ name: "Test Lead" });
    const fakeSignature = "sha256=" + "a".repeat(64);

    expect(verifyHmacSignature(body, fakeSignature, secret)).toBe(false);
  });

  it("should reject when body is tampered", () => {
    const originalBody = JSON.stringify({ name: "Original" });
    const signature =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(originalBody).digest("hex");
    const tamperedBody = JSON.stringify({ name: "Tampered" });

    expect(verifyHmacSignature(tamperedBody, signature, secret)).toBe(false);
  });

  it("should reject when secret is empty", () => {
    const body = JSON.stringify({ name: "Test" });
    expect(verifyHmacSignature(body, "sha256=abc", "")).toBe(false);
  });

  it("should reject when signature is empty", () => {
    const body = JSON.stringify({ name: "Test" });
    expect(verifyHmacSignature(body, "", secret)).toBe(false);
  });

  it("should handle signature without sha256= prefix", () => {
    const body = JSON.stringify({ name: "Test" });
    const rawSig = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    // Without prefix, it should still work since we strip "sha256="
    expect(verifyHmacSignature(body, rawSig, secret)).toBe(true);
  });
});

describe("Webhook origin validation", () => {
  const allowedOrigins = [
    "https://virtualcustomersolution.com",
    "https://digitalpointllc.com",
    "https://backupsolutions.com",
  ];

  function isOriginAllowed(origin: string, allowed: string[]): boolean {
    return allowed.some(
      (o) => origin === o || origin === o.replace("https://", "https://www.")
    );
  }

  it("should allow listed origins", () => {
    expect(
      isOriginAllowed("https://virtualcustomersolution.com", allowedOrigins)
    ).toBe(true);
  });

  it("should allow www variant of listed origins", () => {
    expect(
      isOriginAllowed("https://www.virtualcustomersolution.com", allowedOrigins)
    ).toBe(true);
  });

  it("should reject unlisted origins", () => {
    expect(
      isOriginAllowed("https://malicious-site.com", allowedOrigins)
    ).toBe(false);
  });
});
