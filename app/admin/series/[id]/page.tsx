import { notFound } from "next/navigation";
import { EpisodeManager } from "@/components/admin/EpisodeManager";
import { SeriesForm } from "@/components/admin/SeriesForm";
import { requireAdmin } from "@/lib/admin";
import { getEpisodeBunnyHealthFlags } from "@/lib/admin/bunny-episode-health";
import { syncEpisodeBunnyMetadata } from "@/lib/admin/sync-episode-bunny-metadata";
import { createAdminClient } from "@/lib/supabase/admin";

interface AdminSeriesEditPageProps {
  params: { id: string };
}

export default async function AdminSeriesEditPage({ params }: AdminSeriesEditPageProps) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: series } = await admin
    .from("series")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!series) notFound();

  const { data: episodesRaw } = await admin
    .from("episodes")
    .select(
      "id, episode_number, title, bunny_video_id, video_url, thumbnail_url, duration_seconds, display_view_count"
    )
    .eq("series_id", params.id)
    .order("episode_number", { ascending: true });

  const episodesList = episodesRaw ?? [];
  if (episodesList.length > 0) {
    await syncEpisodeBunnyMetadata(admin, episodesList);
  }

  const { data: episodes } = await admin
    .from("episodes")
    .select(
      "id, episode_number, title, bunny_video_id, video_url, thumbnail_url, duration_seconds, display_view_count"
    )
    .eq("series_id", params.id)
    .order("episode_number", { ascending: true });

  const bunnyHealthFlags = await getEpisodeBunnyHealthFlags(episodes ?? []);

  const nextEpisodeNumber =
    episodes && episodes.length > 0
      ? Math.max(...episodes.map((e) => e.episode_number)) + 1
      : 1;

  return (
    <div className="space-y-10">
      <SeriesForm initial={series} />

      <EpisodeManager
        seriesId={params.id}
        seriesTitle={series.title}
        episodes={episodes ?? []}
        nextEpisodeNumber={nextEpisodeNumber}
        bunnyHealthFlags={bunnyHealthFlags}
      />
    </div>
  );
}
