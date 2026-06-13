import Link from "next/link";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { VideoPlayerPlaceholder } from "@/components/watch/VideoPlayerPlaceholder";
import { createClient } from "@/lib/supabase/server";
import { PLACEHOLDER_SERIES } from "@/lib/types/database";

interface WatchPageProps {
  params: { episodeId: string };
}

async function getEpisode(episodeId: string) {
  const supabase = createClient();

  const { data: episode } = await supabase
    .from("episodes")
    .select("id, episode_number, title, series_id")
    .eq("id", episodeId)
    .maybeSingle();

  if (episode) {
    const { data: series } = await supabase
      .from("series")
      .select("title, slug, status")
      .eq("id", episode.series_id)
      .maybeSingle();

    if (series?.status === "published") {
      return {
        id: episode.id,
        episode_number: episode.episode_number,
        title: episode.title,
        seriesTitle: series.title,
        seriesSlug: series.slug,
      };
    }
  }

  const match = episodeId.match(/^placeholder-ep-(\d+)$/);
  if (match) {
    const num = Number(match[1]);
    const series = PLACEHOLDER_SERIES[0];
    return {
      id: episodeId,
      episode_number: num,
      title: `Episode ${num}`,
      seriesTitle: series.title,
      seriesSlug: series.slug,
    };
  }

  return null;
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { episodeId } = params;
  const episode = await getEpisode(episodeId);

  if (!episode) notFound();

  return (
    <div className="min-h-screen bg-black">
      <TopNav />
      <main className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-8">
        <VideoPlayerPlaceholder
          episodeTitle={episode.title}
          seriesTitle={episode.seriesTitle}
        />
        <div className="w-full max-w-md text-center">
          <Link
            href={`/series/${episode.seriesSlug}`}
            className="text-sm text-gray-400 hover:text-obsidian-red"
          >
            &larr; Back to {episode.seriesTitle}
          </Link>
          <p className="mt-2 text-xs text-gray-500">
            Episode {episode.episode_number} · Player placeholder
          </p>
        </div>
      </main>
    </div>
  );
}
