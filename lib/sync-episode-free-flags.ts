import type { SupabaseClient } from "@supabase/supabase-js";

/** Keep episodes.is_free in sync after free_episode_count changes. */
export async function syncEpisodeFreeFlags(
  admin: SupabaseClient,
  seriesId: string,
  freeEpisodeCount: number
): Promise<void> {
  const { data: episodes, error: fetchError } = await admin
    .from("episodes")
    .select("id, episode_number")
    .eq("series_id", seriesId);

  if (fetchError) throw new Error(fetchError.message);
  if (!episodes?.length) return;

  await Promise.all(
    episodes.map((ep) =>
      admin
        .from("episodes")
        .update({ is_free: ep.episode_number <= freeEpisodeCount })
        .eq("id", ep.id)
    )
  );
}
