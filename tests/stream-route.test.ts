import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/episodes/[id]/stream/route";

const VIDEO = "0f6b2c1e-1111-4222-8333-944445555666";
const RAW = `https://vz-test.b-cdn.net/${VIDEO}/playlist.m3u8`;
const EP_FREE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const EP_LOCKED = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5";

const episodes: Record<string, { episode_number: number; status: string }> = {
  [EP_FREE]: { episode_number: 1, status: "published" },
  [EP_LOCKED]: { episode_number: 5, status: "published" },
};

let currentUser: { id: string } | null = null;
const hasActiveAccess = vi.fn();
const verifyCheckoutSession = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      let id = "";
      const q = {
        select: () => q,
        eq: (_col: string, value: string) => {
          id = value;
          return q;
        },
        maybeSingle: async () => {
          const ep = episodes[id];
          return {
            data: ep
              ? { id, episode_number: ep.episode_number, video_url: RAW, duration_seconds: 120, series: { status: ep.status } }
              : null,
            error: null,
          };
        },
      };
      return q;
    },
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
}));
vi.mock("@/lib/payments/access", () => ({ hasActiveAccess: (id: string | null) => hasActiveAccess(id) }));
vi.mock("@/lib/stripe/server", () => ({ verifyCheckoutSession: (id: string) => verifyCheckoutSession(id) }));


async function call(id: string, query = "") {
  const res = await GET(new Request(`https://example.test/api/episodes/${id}/stream${query}`), { params: { id } });
  return { status: res.status, body: (await res.json()) as { url?: string; error?: string } };
}

describe("GET /api/episodes/[id]/stream", () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.BUNNY_TOKEN_AUTH_KEY = "SecurityKey";
    process.env.BUNNY_CDN_HOSTNAME = "vz-test.b-cdn.net";
    currentUser = null;
    hasActiveAccess.mockReset().mockResolvedValue(false);
    verifyCheckoutSession.mockReset().mockResolvedValue(null);
  });
  afterEach(() => {
    process.env = { ...env };
  });

  it("free episode → signed URL for anyone (never the raw URL)", async () => {
    const { status, body } = await call(EP_FREE);
    expect(status).toBe(200);
    expect(body.url).toContain("/bcdn_token=HS256-");
    expect(body.url).not.toBe(RAW);
  });

  it("locked episode without access → 403, no URL", async () => {
    currentUser = { id: "u1" };
    const { status, body } = await call(EP_LOCKED);
    expect(status).toBe(403);
    expect(body.url).toBeUndefined();
    expect(hasActiveAccess).toHaveBeenCalledWith("u1");
  });

  it("locked episode with active access → signed URL", async () => {
    currentUser = { id: "u1" };
    hasActiveAccess.mockResolvedValue(true);
    const { status, body } = await call(EP_LOCKED);
    expect(status).toBe(200);
    expect(body.url).toContain("/bcdn_token=");
  });

  it("locked episode with a completed Stripe guest checkout → signed URL", async () => {
    verifyCheckoutSession.mockResolvedValue({ active: true });
    const { status } = await call(EP_LOCKED, "?session_id=cs_test_123");
    expect(status).toBe(200);
  });

  it("unknown or malformed id → 404", async () => {
    expect((await call("not-a-uuid")).status).toBe(404);
    expect((await call("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")).status).toBe(404);
  });
});
