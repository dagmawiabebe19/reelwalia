import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyChapaWebhookSignature } from "@/lib/payments/chapa/signature";

const SECRET = "test-webhook-secret";
const body = JSON.stringify({ event: "charge.success", tx_ref: "rw-abc", status: "success", amount: "150.00" });
const sign = (payload: string, key = SECRET) => createHmac("sha256", key).update(payload).digest("hex");

describe("verifyChapaWebhookSignature", () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.CHAPA_WEBHOOK_SECRET = SECRET;
    delete process.env.CHAPA_SECRET_KEY;
  });
  afterEach(() => {
    process.env = { ...env };
  });

  it("accepts a valid x-chapa-signature over the raw body", () => {
    expect(verifyChapaWebhookSignature({ rawBody: body, xChapaSignature: sign(body), chapaSignature: null })).toBe(true);
  });

  it("accepts upper-case hex", () => {
    expect(
      verifyChapaWebhookSignature({ rawBody: body, xChapaSignature: sign(body).toUpperCase(), chapaSignature: null })
    ).toBe(true);
  });

  it("rejects a tampered body", () => {
    const tampered = body.replace("150.00", "1.00");
    expect(verifyChapaWebhookSignature({ rawBody: tampered, xChapaSignature: sign(body), chapaSignature: null })).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const sig = sign(body);
    const flipped = (sig[0] === "a" ? "b" : "a") + sig.slice(1);
    expect(verifyChapaWebhookSignature({ rawBody: body, xChapaSignature: flipped, chapaSignature: null })).toBe(false);
  });

  it("rejects a signature made with the wrong key", () => {
    expect(
      verifyChapaWebhookSignature({ rawBody: body, xChapaSignature: sign(body, "attacker"), chapaSignature: null })
    ).toBe(false);
  });

  it("rejects missing signatures and missing secrets", () => {
    expect(verifyChapaWebhookSignature({ rawBody: body, xChapaSignature: null, chapaSignature: null })).toBe(false);
    delete process.env.CHAPA_WEBHOOK_SECRET;
    expect(verifyChapaWebhookSignature({ rawBody: body, xChapaSignature: sign(body), chapaSignature: null })).toBe(false);
  });
});
