import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adminError,
  dbError,
  gateCommercialsAdmin,
  parseCommercialPayload,
  removeCommercialObjects,
  revalidateCommercials,
} from "@/lib/commercials/admin-server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: { id: string } };

async function loadMedia(id: string) {
  return createAdminClient()
    .from("commercials")
    .select("video_url, thumbnail_url")
    .eq("id", id)
    .maybeSingle();
}

/** Partial update: full edit, publish/featured toggles, or sort order. */
export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await gateCommercialsAdmin();
  if (denied) return denied;
  if (!UUID_RE.test(params.id)) return adminError(400, "bad_request", "Invalid commercial id.");

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return adminError(400, "bad_request", "Invalid request.");
  }
  const parsed = parseCommercialPayload(raw, "patch");
  if (!parsed.ok) return adminError(400, "invalid", parsed.error);

  const { data: existing, error: loadErr } = await loadMedia(params.id);
  if (loadErr) return dbError(loadErr);
  if (!existing) return adminError(404, "not_found", "That commercial no longer exists.");

  const { error } = await createAdminClient().from("commercials").update(parsed.value).eq("id", params.id);
  if (error) return dbError(error);

  // Replaced media: delete the old files now that the row points at the new ones.
  const replaced: (string | null)[] = [];
  if (parsed.value.video_url && parsed.value.video_url !== existing.video_url) replaced.push(existing.video_url as string);
  if ("thumbnail_url" in parsed.value && parsed.value.thumbnail_url !== existing.thumbnail_url)
    replaced.push(existing.thumbnail_url as string | null);
  await removeCommercialObjects(replaced);

  revalidateCommercials();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const denied = await gateCommercialsAdmin();
  if (denied) return denied;
  if (!UUID_RE.test(params.id)) return adminError(400, "bad_request", "Invalid commercial id.");

  const { data: existing, error: loadErr } = await loadMedia(params.id);
  if (loadErr) return dbError(loadErr);
  if (!existing) return adminError(404, "not_found", "That commercial no longer exists.");

  const { error } = await createAdminClient().from("commercials").delete().eq("id", params.id);
  if (error) return dbError(error);

  const storage = await removeCommercialObjects([
    existing.video_url as string,
    existing.thumbnail_url as string | null,
  ]);

  revalidateCommercials();
  return NextResponse.json({ ok: true, filesRemoved: storage.ok });
}
