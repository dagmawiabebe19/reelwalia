import { createAdminClient } from "@/lib/supabase/admin";
import type { EpisodeCaption } from "@/lib/types/database";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export interface CaptionTrackForPlayer {
  languageCode: string;
  languageLabel: string;
  src: string;
}

export async function getEpisodeCaptionsForAdmin(
  episodeId: string
): Promise<EpisodeCaption[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("episode_captions")
    .select("*")
    .eq("episode_id", episodeId)
    .order("language_code", { ascending: true });

  if (error) {
    console.error("getEpisodeCaptionsForAdmin:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getEpisodeCaptionsBySeries(
  seriesId: string
): Promise<Record<string, EpisodeCaption[]>> {
  const admin = createAdminClient();

  const { data: episodes } = await admin
    .from("episodes")
    .select("id")
    .eq("series_id", seriesId);

  const episodeIds = (episodes ?? []).map((e) => e.id);
  if (!episodeIds.length) return {};

  const { data, error } = await admin
    .from("episode_captions")
    .select("*")
    .in("episode_id", episodeIds)
    .order("language_code", { ascending: true });

  if (error) {
    console.error("getEpisodeCaptionsBySeries:", error.message);
    return {};
  }

  const byEpisode: Record<string, EpisodeCaption[]> = {};
  for (const row of data ?? []) {
    if (!byEpisode[row.episode_id]) byEpisode[row.episode_id] = [];
    byEpisode[row.episode_id].push(row);
  }

  return byEpisode;
}

export async function getSignedCaptionTracksForEpisode(
  episodeId: string
): Promise<CaptionTrackForPlayer[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("episode_captions")
    .select("language_code, language_label, storage_path")
    .eq("episode_id", episodeId)
    .order("language_code", { ascending: true });

  if (error || !data?.length) return [];

  const tracks: CaptionTrackForPlayer[] = [];

  for (const row of data) {
    const { data: signed, error: signError } = await admin.storage
      .from("captions")
      .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);

    if (signError || !signed?.signedUrl) {
      console.error("caption signed URL failed:", row.storage_path, signError?.message);
      continue;
    }

    tracks.push({
      languageCode: row.language_code,
      languageLabel: row.language_label,
      src: signed.signedUrl,
    });
  }

  return tracks;
}
