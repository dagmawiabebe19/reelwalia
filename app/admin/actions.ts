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

export async function saveSeries(data: SeriesFormData) {
  await requireAdmin();
  const admin = createAdminClient();

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
    orientation: data.orientation,
    status: data.is_published ? "published" : "draft",
  };

  if (data.id) {
    const { error } = await admin.from("series").update(payload).eq("id", data.id);
    if (error) throw new Error(error.message);
    await syncEpisodeFreeFlags(admin, data.id, data.free_episode_count);
    revalidatePath("/admin/series");
    revalidatePath(`/admin/series/${data.id}`);
    revalidatePath("/");
    revalidatePath(`/series/${payload.slug}`);
    return { id: data.id };
  }

  const { data: created, error } = await admin
    .from("series")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/admin/series");
  revalidatePath("/");
  revalidatePath(`/series/${payload.slug}`);
  redirect(`/admin/series/${created.id}`);
}

export async function deleteSeries(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("series").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/series");
  redirect("/admin/series");
}
