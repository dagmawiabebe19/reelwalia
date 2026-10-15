"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  COMMERCIAL_ASPECT_RATIOS,
  COMMERCIALS_BUCKET,
  INQUIRY_STATUSES,
  type CommercialAspectRatio,
  type InquiryStatus,
} from "@/lib/commercials/constants";

export interface CommercialFormData {
  id?: string;
  title: string;
  client_name: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  aspect_ratio: CommercialAspectRatio;
  duration_seconds: number | null;
  category: string;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
}

function revalidateCommercials() {
  revalidatePath("/commercials");
  revalidatePath("/admin/commercials");
}

/** Object path inside the commercials bucket for a public URL we issued, else null. */
function bucketPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${COMMERCIALS_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

async function removeObjects(urls: (string | null | undefined)[]) {
  const paths = urls.map(bucketPath).filter((p): p is string => Boolean(p));
  if (paths.length === 0) return;
  const { error } = await createAdminClient().storage.from(COMMERCIALS_BUCKET).remove(paths);
  if (error) console.error("[commercials] storage cleanup failed:", error.message);
}

const blank = (v: string) => v.trim() || null;

export async function saveCommercial(data: CommercialFormData): Promise<{ id: string }> {
  await requireAdmin();
  if (!data.title.trim()) throw new Error("Title is required.");
  if (!data.video_url.trim()) throw new Error("Upload a video first.");
  if (!COMMERCIAL_ASPECT_RATIOS.includes(data.aspect_ratio)) throw new Error("Invalid aspect ratio.");

  const payload = {
    title: data.title.trim(),
    client_name: blank(data.client_name),
    description: blank(data.description),
    video_url: data.video_url.trim(),
    thumbnail_url: blank(data.thumbnail_url),
    aspect_ratio: data.aspect_ratio,
    duration_seconds:
      data.duration_seconds != null && Number.isFinite(data.duration_seconds)
        ? Math.max(0, Math.round(data.duration_seconds))
        : null,
    category: blank(data.category),
    is_featured: data.is_featured,
    is_published: data.is_published,
    sort_order: Number.isFinite(data.sort_order) ? Math.round(data.sort_order) : 0,
  };

  const admin = createAdminClient();

  if (data.id) {
    const { data: existing } = await admin
      .from("commercials")
      .select("video_url, thumbnail_url")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await admin.from("commercials").update(payload).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (existing) {
      await removeObjects([
        existing.video_url !== payload.video_url ? (existing.video_url as string) : null,
        existing.thumbnail_url !== payload.thumbnail_url ? (existing.thumbnail_url as string | null) : null,
      ]);
    }
    revalidateCommercials();
    return { id: data.id };
  }

  const { data: created, error } = await admin.from("commercials").insert(payload).select("id").single();
  if (error || !created) throw new Error(error?.message ?? "Could not create commercial.");
  revalidateCommercials();
  return { id: created.id as string };
}

export async function setCommercialPublished(id: string, published: boolean) {
  await requireAdmin();
  const { error } = await createAdminClient()
    .from("commercials")
    .update({ is_published: published })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateCommercials();
}

export async function deleteCommercial(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("commercials")
    .select("video_url, thumbnail_url")
    .eq("id", id)
    .maybeSingle();
  const { error } = await admin.from("commercials").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (existing) await removeObjects([existing.video_url as string, existing.thumbnail_url as string | null]);
  revalidateCommercials();
}

/** Discard an uploaded-but-unsaved file (editor cancelled or file replaced before saving). */
export async function discardCommercialUpload(url: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const [byVideo, byThumb] = await Promise.all([
    admin.from("commercials").select("id").eq("video_url", url).limit(1),
    admin.from("commercials").select("id").eq("thumbnail_url", url).limit(1),
  ]);
  if (byVideo.error || byThumb.error) return;
  if ((byVideo.data?.length ?? 0) > 0 || (byThumb.data?.length ?? 0) > 0) return;
  await removeObjects([url]);
}

export async function updateInquiryStatus(id: string, status: InquiryStatus) {
  await requireAdmin();
  if (!INQUIRY_STATUSES.includes(status)) throw new Error("Invalid status.");
  const { error } = await createAdminClient()
    .from("commercial_inquiries")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/commercials");
}
