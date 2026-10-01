import { describe, expect, it } from "vitest";
import { computeChapaPeriodEnd, evaluateAccess, type EntitlementRow } from "@/lib/payments/access-rules";

const NOW = Date.parse("2026-10-01T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const future = new Date(NOW + 5 * DAY).toISOString();
const past = new Date(NOW - 5 * DAY).toISOString();

function row(provider: "stripe" | "chapa", status: string, end: string | null, id = `${provider}-${status}`): EntitlementRow {
  return { id, provider, status, plan: "1month", current_period_end: end };
}

function access(profileStatus: string | null, rows: EntitlementRow[]) {
  return evaluateAccess({ profileStatus, rows, nowMs: NOW });
}

describe("access matrix — Stripe", () => {
  it.each([
    ["active", true],
    ["trialing", true],
    ["past_due", false],
    ["canceled", false],
    ["none", false],
    [null, false],
  ])("profile status %s (no rows) → %s", (status, expected) => {
    expect(access(status, []).active).toBe(expected);
  });

  it("canceled row with paid period not yet ended → access (no early cut-off)", () => {
    const a = access("canceled", [row("stripe", "canceled", future)]);
    expect(a.active).toBe(true);
    expect(a.provider).toBe("stripe");
    expect(a.stripe.canceledWithTimeLeft).toBe(true);
    expect(a.stripe.periodEnd).toBe(future);
  });

  it("canceled row whose period ended → no access", () => {
    expect(access("canceled", [row("stripe", "canceled", past)]).active).toBe(false);
  });

  it("past_due row never grants, even with a future period end (unpaid renewal)", () => {
    expect(access("past_due", [row("stripe", "past_due", future)]).active).toBe(false);
  });

  it("active row grants only while in period", () => {
    expect(access("none", [row("stripe", "active", future)]).active).toBe(true);
    expect(access("none", [row("stripe", "active", past)]).active).toBe(false);
  });

  it("rows without provider are treated as Stripe (pre-033 rows)", () => {
    const legacy: EntitlementRow = { id: "x", provider: null, status: "canceled", current_period_end: future };
    expect(access(null, [legacy]).active).toBe(true);
  });

  it("missing period end never grants from a row", () => {
    expect(access(null, [row("stripe", "canceled", null)]).active).toBe(false);
  });
});

describe("access matrix — Chapa", () => {
  it("active pass in period → access", () => {
    const a = access(null, [row("chapa", "active", future)]);
    expect(a.active).toBe(true);
    expect(a.provider).toBe("chapa");
    expect(a.chapa.periodEnd).toBe(future);
    expect(a.chapaRowsToExpire).toEqual([]);
  });

  it("active pass past its end → no access, flagged for lazy expiry", () => {
    const a = access(null, [row("chapa", "active", past, "c1")]);
    expect(a.active).toBe(false);
    expect(a.chapaRowsToExpire).toEqual(["c1"]);
    expect(a.chapa.periodEnd).toBe(past);
  });

  it.each(["expired", "canceled"])("%s pass → no access even if end is in the future", (status) => {
    expect(access(null, [row("chapa", status, future)]).active).toBe(false);
  });

  it("Stripe wins the provider label when both grant", () => {
    const a = access("active", [row("chapa", "active", future)]);
    expect(a.provider).toBe("stripe");
    expect(a.chapa.active).toBe(true);
  });

  it("chapa canceled rows never grant via the Stripe canceled-period rule", () => {
    expect(access(null, [row("chapa", "canceled", future)]).stripe.active).toBe(false);
  });
});

describe("computeChapaPeriodEnd — renewal math (mirrors grant_chapa_entitlement)", () => {
  it("active pass extends from its existing end", () => {
    const end = computeChapaPeriodEnd({
      currentStatus: "active",
      currentPeriodEnd: new Date(NOW + 10 * DAY).toISOString(),
      periodDays: 7,
      nowMs: NOW,
    });
    expect(end.getTime()).toBe(NOW + 17 * DAY);
  });

  it("expired pass renews from now, not from the past end", () => {
    const end = computeChapaPeriodEnd({
      currentStatus: "expired",
      currentPeriodEnd: new Date(NOW - 10 * DAY).toISOString(),
      periodDays: 7,
      nowMs: NOW,
    });
    expect(end.getTime()).toBe(NOW + 7 * DAY);
  });

  it("active-but-lapsed (not yet lazily expired) also renews from now", () => {
    const end = computeChapaPeriodEnd({
      currentStatus: "active",
      currentPeriodEnd: new Date(NOW - 1 * DAY).toISOString(),
      periodDays: 30,
      nowMs: NOW,
    });
    expect(end.getTime()).toBe(NOW + 30 * DAY);
  });

  it("first purchase (no row) starts from now", () => {
    const end = computeChapaPeriodEnd({ currentStatus: null, currentPeriodEnd: null, periodDays: 14, nowMs: NOW });
    expect(end.getTime()).toBe(NOW + 14 * DAY);
  });

  it("rejects non-positive durations", () => {
    expect(() => computeChapaPeriodEnd({ currentStatus: null, currentPeriodEnd: null, periodDays: 0 })).toThrow();
  });
});
