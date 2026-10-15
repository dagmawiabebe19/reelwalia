import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adminError,
  bucketPathFromUrl,
  gateCommercialsAdmin,
  removeCommercialObjects,
} from "@/lib/commercials/admin-server";
import { isCommercialObjectPath } from "@/lib/commercials/object-path";

/** Delete an uploaded file that never got saved to a row (editor cancelled / file replaced). */
export async function POST(request: Request) {
  const denied = await gateCommercialsAdmin();
  if (denied) return denied;

  let body: { path?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return adminError(400, "bad_request", "Invalid request.");
  }
  const path = typeof body.path === "string" ? body.path : "";
  if (!isCommercialObjectPath(path)) return adminError(400, "bad_request", "Invalid path.");

  const admin = createAdminClient();
  const { data: rows, error } = await admin.from("commercials").select("video_url, thumbnail_url");
  if (error) return NextResponse.json({ ok: false });
  const inUse = (rows ?? []).some(
    (r) => bucketPathFromUrl(r.video_url as string) === path || bucketPathFromUrl(r.thumbnail_url as string | null) === path
  );
  if (inUse) return NextResponse.json({ ok: true, kept: true });

  await removeCommercialObjects([path]);
  return NextResponse.json({ ok: true });
}
