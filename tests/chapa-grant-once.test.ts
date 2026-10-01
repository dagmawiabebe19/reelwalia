import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDb } from "./helpers/fake-supabase";
import { fulfillChapaPayment } from "@/lib/payments/chapa/fulfill";
import { POST as chapaWebhook } from "@/app/api/webhooks/chapa/route";

const NOW = Date.parse("2026-10-01T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const USER = "11111111-1111-4111-8111-111111111111";
const SECRET = "test-webhook-secret";

let db: FakeDb;
const verifyMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db }));
vi.mock("@/lib/payments/chapa/client", () => ({ chapaVerify: (txRef: string) => verifyMock(txRef) }));


function seedPayment(txRef: string, overrides: Record<string, unknown> = {}) {
  db.tables.payments.push({
    id: db.nextId(),
    user_id: USER,
    provider: "chapa",
    provider_tx_ref: txRef,
    plan: "1week",
    amount_minor: 15000,
    currency: "ETB",
    period_days: 7,
    status: "pending",
    episode_id: null,
    ...overrides,
  });
}

function paidTx(txRef: string, amount = 150) {
  return {
    kind: "found",
    tx: { status: "success", txRef, amount, currency: "ETB", reference: "APxyz", mode: "test", raw: {} },
  };
}

function chapaSub() {
  return db.tables.subscriptions.find((s) => s.user_id === USER && s.provider === "chapa");
}

function signedWebhook(payload: object, signature?: string) {
  const body = JSON.stringify(payload);
  const sig = signature ?? createHmac("sha256", SECRET).update(body).digest("hex");
  return new Request("https://example.test/api/webhooks/chapa", {
    method: "POST",
    headers: { "content-type": "application/json", "x-chapa-signature": sig },
    body,
  });
}

describe("Chapa grant-once idempotency", () => {
  const env = { ...process.env };
  beforeEach(() => {
    db = new FakeDb(() => NOW);
    verifyMock.mockReset();
    process.env.CHAPA_WEBHOOK_SECRET = SECRET;
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
  });

  it("same tx_ref fulfilled twice grants exactly once and adds days once", async () => {
    seedPayment("rw-once");
    verifyMock.mockResolvedValue(paidTx("rw-once"));

    const first = await fulfillChapaPayment("rw-once");
    const second = await fulfillChapaPayment("rw-once");

    expect(first).toMatchObject({ status: "success", granted: true });
    expect(second).toMatchObject({ status: "success", granted: false });
    expect(Date.parse(String(chapaSub()?.current_period_end))).toBe(NOW + 7 * DAY);
  });

  it("concurrent webhook + callback + return-page fulfilment grants once", async () => {
    seedPayment("rw-race");
    verifyMock.mockResolvedValue(paidTx("rw-race"));

    const results = await Promise.all([
      fulfillChapaPayment("rw-race"),
      fulfillChapaPayment("rw-race"),
      fulfillChapaPayment("rw-race"),
    ]);

    expect(results.filter((r) => r.granted)).toHaveLength(1);
    expect(results.every((r) => r.status === "success")).toBe(true);
    expect(Date.parse(String(chapaSub()?.current_period_end))).toBe(NOW + 7 * DAY);
  });

  it("amount mismatch is never granted", async () => {
    seedPayment("rw-cheap");
    verifyMock.mockResolvedValue(paidTx("rw-cheap", 1));

    const result = await fulfillChapaPayment("rw-cheap");
    expect(result).toMatchObject({ status: "failed", granted: false });
    expect(chapaSub()).toBeUndefined();
    expect(db.rpcCalls).toBe(0);
  });

  it("unpaid tx stays pending and grants nothing", async () => {
    seedPayment("rw-unpaid");
    verifyMock.mockResolvedValue({ kind: "not_paid" });
    expect(await fulfillChapaPayment("rw-unpaid")).toMatchObject({ status: "pending", granted: false });
    expect(chapaSub()).toBeUndefined();
  });

  it("replayed signed webhook is processed once; second delivery is a duplicate", async () => {
    seedPayment("rw-hook");
    verifyMock.mockResolvedValue(paidTx("rw-hook"));
    const event = { event: "charge.success", tx_ref: "rw-hook", status: "success" };

    const res1 = await chapaWebhook(signedWebhook(event));
    const res2 = await chapaWebhook(signedWebhook(event));

    expect(res1.status).toBe(200);
    expect(await res1.json()).toEqual({ received: true });
    expect(res2.status).toBe(200);
    expect(await res2.json()).toMatchObject({ duplicate: true });
    expect(db.rpcCalls).toBe(1);
    expect(db.tables.processed_webhook_events).toHaveLength(1);
    expect(Date.parse(String(chapaSub()?.current_period_end))).toBe(NOW + 7 * DAY);
  });

  it("tampered webhook signature → 401 and nothing granted", async () => {
    seedPayment("rw-forged");
    verifyMock.mockResolvedValue(paidTx("rw-forged"));
    const res = await chapaWebhook(
      signedWebhook({ event: "charge.success", tx_ref: "rw-forged", status: "success" }, "deadbeef")
    );
    expect(res.status).toBe(401);
    expect(verifyMock).not.toHaveBeenCalled();
    expect(chapaSub()).toBeUndefined();
  });

  it("a second, different payment stacks onto an active pass", async () => {
    seedPayment("rw-first");
    seedPayment("rw-second");
    verifyMock.mockImplementation((ref: string) => Promise.resolve(paidTx(ref)));

    await fulfillChapaPayment("rw-first");
    await fulfillChapaPayment("rw-second");
    expect(Date.parse(String(chapaSub()?.current_period_end))).toBe(NOW + 14 * DAY);
  });
});
