import { getThumbnailUrl, getVideoStatus } from "@/lib/bunny";
import type { SupabaseClient } from "@supabase/supabase-js";

type EpisodeBunnyRow = {
  id: string;
  bunny_video_id: string | null;
  duration_seconds: number | null;
};

function isDemoBunnyId(id: string | null | undefined): boolean {
  return !id || id.startsWith("demo-");
}

/** Refresh duration (and thumbnail URL) from Bunny when transcode finishes. */
export async function syncEpisodeBunnyMetadata(
  admin: SupabaseClient,
  episodes: EpisodeBunnyRow[]
): Promise<number> {
  const pending = episodes.filter(
    (ep) =>
      !isDemoBunnyId(ep.bunny_video_id) &&
      (ep.duration_seconds == null || ep.duration_seconds <= 0)
  );

  let updated = 0;

  for (const ep of pending) {
    const videoId = ep.bunny_video_id!;
    try {
      const status = await getVideoStatus(videoId);
      if (status.length <= 0) continue;

      const { error } = await admin
        .from("episodes")
        .update({
          duration_seconds: Math.round(status.length),
          thumbnail_url: getThumbnailUrl(videoId),
        })
        .eq("id", ep.id);

      if (!error) updated += 1;
    } catch (err) {
      console.warn("Bunny metadata sync skipped for episode", ep.id, err);
    }
  }

  return updated;
}
