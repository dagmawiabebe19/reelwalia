import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as chapaCheckout } from "@/app/api/payments/chapa/checkout/route";
import { POST as stripeCheckout } from "@/app/api/stripe/checkout/route";

const { getUser, createCheckoutSession, createGuestCheckoutSession } = vi.hoisted(() => ({
  getUser: vi.fn(),
  createCheckoutSession: vi.fn(),
  createGuestCheckoutSession: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ auth: { getUser } }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("admin client must not be used when the provider is unavailable");
  },
}));
vi.mock("@/lib/stripe/server", () => ({ createCheckoutSession, createGuestCheckoutSession }));
vi.mock("@/lib/traffic-source-server", () => ({ resolveTrafficSource: () => null }));

const ENV_KEYS = [
  "CHAPA_SECRET_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_1WEEK_INTRO",
  "STRIPE_PRICE_2WEEK_INTRO",
  "STRIPE_PRICE_1MONTH_INTRO",
] as const;
const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

const req = (url: string, body: unknown) =>
  new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  vi.clearAllMocks();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("checkout submit guard", () => {
  it("Chapa unconfigured: 503 provider_unavailable before auth or DB work", async () => {
    const res = await chapaCheckout(req("http://localhost/api/payments/chapa/checkout", { plan: "1month" }));
    expect(res.status).toBe(503);
    const json = (await res.json()) as { error: string; code: string };
    expect(json.code).toBe("provider_unavailable");
    expect(json.error).toMatch(/Telebirr payments are not available/);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("Stripe unconfigured: 503 provider_unavailable without creating a session", async () => {
    const res = await stripeCheckout(req("http://localhost/api/stripe/checkout", { plan: "1month" }));
    expect(res.status).toBe(503);
    const json = (await res.json()) as { error: string; code: string };
    expect(json.code).toBe("provider_unavailable");
    expect(json.error).toMatch(/Card payments are not available/);
    expect(createCheckoutSession).not.toHaveBeenCalled();
    expect(createGuestCheckoutSession).not.toHaveBeenCalled();
  });

  it("Stripe key set but a plan Price ID missing still counts as unavailable", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_PRICE_1WEEK_INTRO = "price_1";
    process.env.STRIPE_PRICE_2WEEK_INTRO = "price_2";
    const res = await stripeCheckout(req("http://localhost/api/stripe/checkout", { plan: "1week" }));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { code: string }).code).toBe("provider_unavailable");
  });
});
