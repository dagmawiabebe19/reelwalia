import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { COMMERCIALS_CACHE_TAG } from "@/lib/commercials/server";
import {
  COMMERCIAL_ASPECT_RATIOS,
  COMMERCIALS_BUCKET,
  type CommercialAspectRatio,
} from "@/lib/commercials/constants";

export const MIGRATION_MISSING_MESSAGE =
  "The commercials database tables or storage bucket are missing. Apply migration 035_commercials.sql (then 036_fix_admin_user_id.sql) in the Supabase SQL editor.";

export type AdminApiError = { error: string; code: string };

export function adminError(status: number, code: string, error: string) {
  return NextResponse.json<AdminApiError>({ error, code }, { status });
}

/** Same UUID gate as every other admin route; returns a ready JSON error response on failure. */
export async function gateCommercialsAdmin(): Promise<NextResponse | null> {
  const auth = await requireAdminApi();
  if (!auth.error) return null;
  return auth.status === 401
    ? adminError(401, "not_signed_in", "You're signed out. Sign in as the admin account and try again.")
    : adminError(403, "not_admin", "This account isn't the ReelWalia admin. Sign in with the admin account.");
}

export function isMissingRelation(err: { message?: string; code?: string } | null | undefined): boolean {
  if (!err) return false;
  return (
    err.code === "PGRST205" ||
    err.code === "42P01" ||
    /could not find the table|does not exist|bucket not found/i.test(err.message ?? "")
  );
}

export function dbError(err: { message?: string; code?: string }) {
  if (isMissingRelation(err)) return adminError(503, "migration_missing", MIGRATION_MISSING_MESSAGE);
  console.error("[admin/commercials] db error:", err.message);
  return adminError(500, "db_error", `Database error: ${err.message ?? "unknown"}`);
}

/** Public /ads is served from the /commercials route; revalidate both paths plus admin. */
export function revalidateCommercials() {
  revalidateTag(COMMERCIALS_CACHE_TAG);
  revalidatePath("/ads");
  revalidatePath("/commercials");
  revalidatePath("/api/commercials");
  revalidatePath("/admin/commercials");
}

/** Object path inside the commercials bucket for a public URL we issued, else null. */
export function bucketPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${COMMERCIALS_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split("?")[0]!);
}

export async function removeCommercialObjects(urlsOrPaths: (string | null | undefined)[]) {
  const paths = urlsOrPaths
    .map((v) => (v && v.startsWith("http") ? bucketPathFromUrl(v) : v))
    .filter((p): p is string => Boolean(p));
  if (paths.length === 0) return { ok: true as const };
  const { error } = await createAdminClient().storage.from(COMMERCIALS_BUCKET).remove(paths);
  if (error) {
    console.error("[admin/commercials] storage cleanup failed:", error.message);
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

export interface CommercialPayload {
  title: string;
  client_name: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  aspect_ratio: CommercialAspectRatio;
  duration_seconds: number | null;
  category: string | null;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
}

const FIELD_MAX = { title: 160, client_name: 160, description: 4000, category: 60 } as const;

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function ownUrl(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  return bucketPathFromUrl(v.trim()) ? v.trim() : null;
}

/**
 * Validate a full (create) or partial (patch) commercial payload. Media URLs must
 * point at our own bucket. Returns only the keys present in the input for patches.
 */
export function parseCommercialPayload(
  raw: unknown,
  mode: "create" | "patch"
): { ok: true; value: Partial<CommercialPayload> } | { ok: false; error: string } {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const has = (k: string) => mode === "create" || k in input;
  const out: Partial<CommercialPayload> = {};

  if (has("title")) {
    const title = text(input.title, FIELD_MAX.title);
    if (!title) return { ok: false, error: "Title is required." };
    out.title = title;
  }
  if (has("video_url")) {
    const url = ownUrl(input.video_url);
    if (!url) return { ok: false, error: "Upload a video first." };
    out.video_url = url;
  }
  if (has("thumbnail_url")) {
    if (input.thumbnail_url && !ownUrl(input.thumbnail_url))
      return { ok: false, error: "Thumbnail must be uploaded to the commercials bucket." };
    out.thumbnail_url = ownUrl(input.thumbnail_url);
  }
  if (has("client_name")) out.client_name = text(input.client_name, FIELD_MAX.client_name);
  if (has("description")) out.description = text(input.description, FIELD_MAX.description);
  if (has("category")) out.category = text(input.category, FIELD_MAX.category);
  if (has("aspect_ratio")) {
    const ar = input.aspect_ratio ?? "9:16";
    if (!COMMERCIAL_ASPECT_RATIOS.includes(ar as CommercialAspectRatio))
      return { ok: false, error: "Aspect ratio must be 9:16, 16:9, or 1:1." };
    out.aspect_ratio = ar as CommercialAspectRatio;
  }
  if (has("duration_seconds")) {
    const d = input.duration_seconds;
    out.duration_seconds =
      typeof d === "number" && Number.isFinite(d) && d >= 0 ? Math.round(d) : null;
  }
  if (has("sort_order")) {
    const s = input.sort_order;
    out.sort_order = typeof s === "number" && Number.isFinite(s) ? Math.round(s) : 0;
  }
  if (has("is_featured")) out.is_featured = input.is_featured === true;
  if (has("is_published")) out.is_published = mode === "create" ? input.is_published !== false : input.is_published === true;

  if (mode === "patch" && Object.keys(out).length === 0) return { ok: false, error: "Nothing to update." };
  return { ok: true, value: out };
}
