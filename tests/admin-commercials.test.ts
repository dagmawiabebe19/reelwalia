import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as uploadUrl } from "@/app/api/admin/commercials/upload-url/route";
import { POST as createCommercial } from "@/app/api/admin/commercials/route";
import { DELETE as deleteCommercial, PATCH as patchCommercial } from "@/app/api/admin/commercials/[id]/route";
import { ADMIN_USER_ID } from "@/lib/admin";

const { state, revalidatePath, revalidateTag } = vi.hoisted(() => ({
  state: {
    user: null as { id: string; email?: string } | null,
    signedPaths: [] as string[],
    removed: [] as string[][],
    inserted: [] as Record<string, unknown>[],
    updated: [] as Record<string, unknown>[],
    deleted: [] as string[],
    row: null as { video_url: string; thumbnail_url: string | null } | null,
  },
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath, revalidateTag, unstable_cache: (fn: unknown) => fn }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));

const PUBLIC = "https://x.supabase.co/storage/v1/object/public/commercials/";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      getBucket: async () => ({ data: { file_size_limit: 500 * 1024 * 1024 }, error: null }),
      from: () => ({
        createSignedUploadUrl: async (path: string) => {
          state.signedPaths.push(path);
          return { data: { path, token: "tok", signedUrl: `https://x.supabase.co/storage/v1/object/upload/sign/commercials/${path}?token=tok` }, error: null };
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: PUBLIC + path } }),
        remove: async (paths: string[]) => {
          state.removed.push(paths);
          return { data: [], error: null };
        },
      }),
    },
    from: () => {
      let id = "";
      const q = {
        select: () => q,
        eq: (_c: string, v: string) => {
          id = v;
          return q;
        },
        maybeSingle: async () => ({ data: state.row, error: null }),
        insert: (row: Record<string, unknown>) => {
          state.inserted.push(row);
          return { select: () => ({ single: async () => ({ data: { id: "new-id" }, error: null }) }) };
        },
        update: (row: Record<string, unknown>) => {
          state.updated.push(row);
          return { eq: async () => ({ error: null }) };
        },
        delete: () => ({
          eq: async (_c: string, v: string) => {
            state.deleted.push(v || id);
            return { error: null };
          },
        }),
      };
      return q;
    },
  }),
}));

const ID = "11111111-2222-4333-8444-555555555555";
const json = (body: unknown) =>
  new Request("http://localhost/api/admin/commercials", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  state.user = { id: ADMIN_USER_ID };
  state.signedPaths = [];
  state.removed = [];
  state.inserted = [];
  state.updated = [];
  state.deleted = [];
  state.row = null;
  revalidatePath.mockClear();
  revalidateTag.mockClear();
});

describe("admin gate (shared ADMIN_USER_ID)", () => {
  it("uses the real project admin id", () => {
    expect(ADMIN_USER_ID).toBe("0102934e-8fa3-4b72-b70d-01d1334febaa");
  });

  it("upload-url: non-admin gets 403, signed-out gets 401", async () => {
    state.user = { id: "99999999-9999-4999-8999-999999999999", email: "dagmawiabebe19@gmail.com" };
    const forbidden = await uploadUrl(json({ kind: "video", fileName: "a.mp4", contentType: "video/mp4" }));
    expect(forbidden.status).toBe(403);
    expect(((await forbidden.json()) as { code: string }).code).toBe("not_admin");

    state.user = null;
    expect((await uploadUrl(json({ kind: "video", fileName: "a.mp4", contentType: "video/mp4" }))).status).toBe(401);
    expect(state.signedPaths).toHaveLength(0);
  });

  it("create/patch/delete reject non-admins", async () => {
    state.user = { id: "someone-else" };
    expect((await createCommercial(json({ title: "x" }))).status).toBe(403);
    expect((await patchCommercial(json({ title: "x" }), { params: { id: ID } })).status).toBe(403);
    expect((await deleteCommercial(json({}), { params: { id: ID } })).status).toBe(403);
    expect(state.inserted.length + state.updated.length + state.deleted.length).toBe(0);
  });
});

describe("POST /api/admin/commercials/upload-url", () => {
  it("returns a signed upload for an allowed video, with an ad-free path", async () => {
    const res = await uploadUrl(json({ kind: "video", fileName: "Spot.MOV", contentType: "", size: 40_000_000 }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { path: string; token: string; publicUrl: string; contentType: string };
    expect(body.path).toMatch(/^videos\/[^/]+\.mov$/);
    expect(body.path).not.toMatch(/ad/i);
    expect(body.token).toBe("tok");
    expect(body.contentType).toBe("video/quicktime");
    expect(body.publicUrl).toBe(PUBLIC + body.path);
  });

  it("rejects disallowed types with a readable message", async () => {
    const video = await uploadUrl(json({ kind: "video", fileName: "spot.avi", contentType: "video/x-msvideo" }));
    expect(video.status).toBe(415);
    expect(((await video.json()) as { error: string }).error).toMatch(/MP4, MOV, or WebM/);

    const thumb = await uploadUrl(json({ kind: "thumbnail", fileName: "t.gif", contentType: "image/gif" }));
    expect(thumb.status).toBe(415);
    expect(((await thumb.json()) as { error: string }).error).toMatch(/JPG, PNG, or WebP/);
  });

  it("rejects files over the bucket limit before signing", async () => {
    const res = await uploadUrl(json({ kind: "video", fileName: "big.mp4", contentType: "video/mp4", size: 600 * 1024 * 1024 }));
    expect(res.status).toBe(413);
    expect(state.signedPaths).toHaveLength(0);
  });
});

describe("commercial rows", () => {
  const video = PUBLIC + "videos/bcefghjkmnpq.mp4";

  it("create inserts and revalidates /ads and /commercials", async () => {
    const res = await createCommercial(json({ title: "Cold Brew", video_url: video, aspect_ratio: "9:16" }));
    expect(res.status).toBe(200);
    expect(state.inserted[0]).toMatchObject({ title: "Cold Brew", video_url: video, is_published: true });
    expect(revalidatePath).toHaveBeenCalledWith("/ads");
    expect(revalidatePath).toHaveBeenCalledWith("/commercials");
    expect(revalidateTag).toHaveBeenCalledWith("commercials");
  });

  it("create refuses media URLs outside the commercials bucket", async () => {
    const res = await createCommercial(json({ title: "x", video_url: "https://evil.example/v.mp4" }));
    expect(res.status).toBe(400);
    expect(state.inserted).toHaveLength(0);
  });

  it("patch toggles featured and revalidates", async () => {
    state.row = { video_url: video, thumbnail_url: null };
    const res = await patchCommercial(json({ is_featured: true }), { params: { id: ID } });
    expect(res.status).toBe(200);
    expect(state.updated[0]).toEqual({ is_featured: true });
    expect(state.removed).toHaveLength(0);
    expect(revalidatePath).toHaveBeenCalledWith("/ads");
  });

  it("patch with a new video deletes the replaced file", async () => {
    state.row = { video_url: video, thumbnail_url: null };
    await patchCommercial(json({ video_url: PUBLIC + "videos/zzzzzzzzzz.mp4" }), { params: { id: ID } });
    expect(state.removed).toEqual([["videos/bcefghjkmnpq.mp4"]]);
  });

  it("delete removes the row and both storage files", async () => {
    state.row = { video_url: video, thumbnail_url: PUBLIC + "thumbs/bcefghjk.jpg" };
    const res = await deleteCommercial(json({}), { params: { id: ID } });
    expect(res.status).toBe(200);
    expect(state.deleted).toEqual([ID]);
    expect(state.removed).toEqual([["videos/bcefghjkmnpq.mp4", "thumbs/bcefghjk.jpg"]]);
    expect(revalidatePath).toHaveBeenCalledWith("/commercials");
  });
});
