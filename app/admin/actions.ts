"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncEpisodeFreeFlags } from "@/lib/sync-episode-free-flags";
import type { SeriesGenre, SeriesOrientation } from "@/lib/types/database";

export interface SeriesFormData {
  id?: string;
  title: string;
  slug: string;
  synopsis: string;
  genre: SeriesGenre;
  total_episodes: number;
  free_episode_count: number;
  poster_url: string;
  hero_banner_url: string;
  is_featured: boolean;
  is_published: boolean;
  orientation: SeriesOrientation;
}

async function nextFeaturedOrder(
  admin: ReturnType<typeof createAdminClient>
): Promise<number> {
  const { data } = await admin
    .from("series")
    .select("featured_order")
    .eq("is_featured", true)
    .not("featured_order", "is", null)
    .order("featured_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.featured_order ?? 0) + 1;
}

async function resequenceFeatured(
  admin: ReturnType<typeof createAdminClient>
): Promise<void> {
  const { data: featured, error } = await admin
    .from("series")
    .select("id")
    .eq("is_featured", true)
    .order("featured_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  await Promise.all(
    (featured ?? []).map((row, index) =>
      admin
        .from("series")
        .update({ featured_order: index + 1 })
        .eq("id", row.id)
    )
  );
}

function revalidateFeaturedPaths() {
  revalidatePath("/");
  revalidatePath("/admin/series");
  revalidatePath("/admin/featured");
}

export async function saveSeries(data: SeriesFormData) {
  await requireAdmin();
  const admin = createAdminClient();

  let featuredOrder: number | null = null;
  if (data.is_featured) {
    if (data.id) {
      const { data: existing } = await admin
        .from("series")
        .select("is_featured, featured_order")
        .eq("id", data.id)
        .maybeSingle();
      if (existing?.is_featured && existing.featured_order != null) {
        featuredOrder = existing.featured_order;
      } else {
        featuredOrder = await nextFeaturedOrder(admin);
      }
    } else {
      featuredOrder = await nextFeaturedOrder(admin);
    }
  }

  const payload = {
    title: data.title.trim(),
    slug: data.slug.trim() || slugify(data.title),
    description: data.synopsis.trim() || null,
    tagline: null,
    genre: [data.genre],
    total_episodes: data.total_episodes,
    free_episode_count: data.free_episode_count,
    poster_url: data.poster_url || null,
    banner_url: data.hero_banner_url || null,
    is_featured: data.is_featured,
    featured_order: featuredOrder,
    orientation: data.orientation,
    status: data.is_published ? "published" : "draft",
  };

  if (data.id) {
    const { error } = await admin.from("series").update(payload).eq("id", data.id);
    if (error) throw new Error(error.message);
    await syncEpisodeFreeFlags(admin, data.id, data.free_episode_count);
    if (!data.is_featured) {
      await resequenceFeatured(admin);
    }
    revalidateFeaturedPaths();
    revalidatePath(`/admin/series/${data.id}`);
    revalidatePath(`/series/${payload.slug}`);
    return { id: data.id };
  }

  const { data: created, error } = await admin
    .from("series")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidateFeaturedPaths();
  revalidatePath(`/series/${payload.slug}`);
  redirect(`/admin/series/${created.id}`);
}

/**
 * Persist homepage Featured hero order. `orderedIds` is the full featured set
 * in display order (rank 1 = first). Admin-only.
 */
export async function reorderFeaturedSeries(orderedIds: string[]) {
  await requireAdmin();
  const admin = createAdminClient();

  if (!orderedIds.length) {
    revalidateFeaturedPaths();
    return;
  }

  const { data: featured, error: fetchError } = await admin
    .from("series")
    .select("id")
    .eq("is_featured", true)
    .in("id", orderedIds);

  if (fetchError) throw new Error(fetchError.message);

  const featuredIds = new Set((featured ?? []).map((row) => row.id));
  const validOrder = orderedIds.filter((id) => featuredIds.has(id));

  await Promise.all(
    validOrder.map((id, index) =>
      admin
        .from("series")
        .update({ featured_order: index + 1, is_featured: true })
        .eq("id", id)
    )
  );

  revalidateFeaturedPaths();
}

/** Add a series to Featured (appended) or remove it and resequence. Admin-only. */
export async function setSeriesFeatured(seriesId: string, featured: boolean) {
  await requireAdmin();
  const admin = createAdminClient();

  if (featured) {
    const order = await nextFeaturedOrder(admin);
    const { error } = await admin
      .from("series")
      .update({ is_featured: true, featured_order: order })
      .eq("id", seriesId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin
      .from("series")
      .update({ is_featured: false, featured_order: null })
      .eq("id", seriesId);
    if (error) throw new Error(error.message);
    await resequenceFeatured(admin);
  }

  revalidateFeaturedPaths();
}

export async function deleteSeries(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("series").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateFeaturedPaths();
  redirect("/admin/series");
}
