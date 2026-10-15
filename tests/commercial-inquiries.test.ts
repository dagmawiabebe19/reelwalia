import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/commercial-inquiries/route";
import { validateCommercialInquiry } from "@/lib/commercials/validation";
import { serializeTrafficSourceCookie, TRAFFIC_SOURCE_COOKIE } from "@/lib/traffic-source";

const { inserted, sendMail, cookieJar, referenceRow } = vi.hoisted(() => ({
  inserted: [] as Record<string, unknown>[],
  sendMail: vi.fn(async () => ({ sent: true })),
  cookieJar: new Map<string, string>(),
  referenceRow: { current: null as { id: string; title: string } | null },
}));

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
  }),
}));

vi.mock("@/lib/email/commercial-inquiry-notification", () => ({
  sendCommercialInquiryNotification: sendMail,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "commercials") {
        const q = {
          select: () => q,
          eq: () => q,
          maybeSingle: async () => ({ data: referenceRow.current, error: null }),
        };
        return q;
      }
      return {
        insert: (row: Record<string, unknown>) => {
          inserted.push(row);
          return { select: () => ({ single: async () => ({ data: { id: "inq-1" }, error: null }) }) };
        },
      };
    },
  }),
}));

const REF_ID = "11111111-2222-4333-8444-555555555555";
let ipCounter = 0;

const valid = {
  name: "Selam Tesfaye",
  email: "Selam@Example.com",
  company: "Habesha Coffee",
  budget_range: "$1,000–$3,000",
  timeline: "2–4 weeks",
  platforms: ["TikTok", "Instagram"],
  message: "We need a 30s vertical spot for our new cold brew launch.",
};

function post(body: unknown, ip = `10.0.0.${++ipCounter}`) {
  return POST(
    new Request("http://localhost/api/commercial-inquiries", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  inserted.length = 0;
  cookieJar.clear();
  referenceRow.current = null;
  sendMail.mockClear();
});

describe("validateCommercialInquiry", () => {
  it("accepts a complete inquiry and normalizes it", () => {
    const r = validateCommercialInquiry({ ...valid, phone: " +251 911 234 567 " });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.email).toBe("selam@example.com");
    expect(r.value.phone).toBe("+251 911 234 567");
    expect(r.value.platforms).toEqual(["TikTok", "Instagram"]);
  });

  it("requires name, email, and message", () => {
    const r = validateCommercialInquiry({});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["email", "message", "name"]);
  });

  it("rejects values outside the allowed option lists", () => {
    const r = validateCommercialInquiry({
      ...valid,
      email: "nope",
      budget_range: "$1M",
      timeline: "yesterday",
      platforms: ["MySpace"],
      reference_commercial_id: "not-a-uuid",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual([
      "budget_range",
      "email",
      "platforms",
      "reference_commercial_id",
      "timeline",
    ]);
  });

  it("treats empty optional selects as null", () => {
    const r = validateCommercialInquiry({ ...valid, budget_range: "", timeline: "", platforms: [] });
    expect(r.ok && r.value.budget_range === null && r.value.timeline === null).toBe(true);
  });
});

describe("POST /api/commercial-inquiries", () => {
  it("honeypot filled: silent 200, nothing stored or emailed", async () => {
    const res = await post({ ...valid, website: "http://spam.example" });
    expect(res.status).toBe(200);
    expect(inserted).toHaveLength(0);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("valid inquiry: inserted with the service-role client and emailed", async () => {
    const res = await post({ ...valid, utm_source: "linkedin", utm_campaign: "q4" });
    expect(res.status).toBe(200);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      name: "Selam Tesfaye",
      email: "selam@example.com",
      platforms: ["TikTok", "Instagram"],
      utm_source: "linkedin",
      utm_campaign: "q4",
    });
    expect(inserted[0]).not.toHaveProperty("website");
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("invalid inquiry: 400 with field errors", async () => {
    const res = await post({ ...valid, email: "bad" });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { fieldErrors: Record<string, string> };
    expect(json.fieldErrors.email).toBeTruthy();
    expect(inserted).toHaveLength(0);
  });

  it("falls back to first-touch UTM cookie when the URL had none", async () => {
    cookieJar.set(
      TRAFFIC_SOURCE_COOKIE,
      serializeTrafficSourceCookie({
        visitorId: "visitor-12345678",
        source: "ad",
        utmSource: "tiktok",
        utmMedium: "paid_social",
        utmCampaign: "launch",
      })
    );
    await post(valid);
    expect(inserted[0]).toMatchObject({ utm_source: "tiktok", utm_medium: "paid_social", utm_campaign: "launch" });
  });

  it("drops a reference to an unknown or unpublished commercial", async () => {
    await post({ ...valid, reference_commercial_id: REF_ID });
    expect(inserted[0]?.reference_commercial_id).toBeNull();

    referenceRow.current = { id: REF_ID, title: "Cold Brew" };
    await post({ ...valid, reference_commercial_id: REF_ID });
    expect(inserted[1]?.reference_commercial_id).toBe(REF_ID);
  });

  it("rate limits to 3 submissions per IP per hour", async () => {
    const ip = "203.0.113.9";
    for (let i = 0; i < 3; i++) expect((await post(valid, ip)).status).toBe(200);
    const blocked = await post(valid, ip);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    expect(inserted).toHaveLength(3);
  });
});
