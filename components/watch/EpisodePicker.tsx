"use client";

import Link from "next/link";
import { WatchEpisodeLink } from "@/components/watch/WatchEpisodeLink";
import { ViewCount } from "@/components/ui/ViewCount";
import { trackEpisodeAdvanced } from "@/lib/analytics/funnel";
import { getEpisodeDisplayViewCount } from "@/lib/episode-view-count";

export interface EpisodePickerItem {
  id: string;
  episode_number: number;
  title: string;
  thumbnail_url: string | null;
  locked: boolean;
  display_view_count?: number | null;
  view_count?: number | null;
}

interface EpisodePickerProps {
  episodes: EpisodePickerItem[];
  currentEpisodeId: string;
  seriesSlug: string;
}

export function EpisodePicker({
  episodes,
  currentEpisodeId,
  seriesSlug,
}: EpisodePickerProps) {
  const currentEpisode = episodes.find((ep) => ep.id === currentEpisodeId);
  const currentEpisodeNumber = currentEpisode?.episode_number ?? 0;

  const handleEpisodeTap = (targetEpisodeId: string, targetEpisodeNumber: number) => {
    if (
      targetEpisodeId === currentEpisodeId ||
      targetEpisodeNumber !== currentEpisodeNumber + 1
    ) {
      return;
    }
    trackEpisodeAdvanced({
      from_episode_id: currentEpisodeId,
      to_episode_id: targetEpisodeId,
      series_slug: seriesSlug,
      method: "manual_tap",
    });
  };

  const grid = (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-2">
      {episodes.map((ep) => (
        <WatchEpisodeLink
          key={ep.id}
          episodeId={ep.id}
          onPointerDown={() => handleEpisodeTap(ep.id, ep.episode_number)}
          className={`relative min-h-11 overflow-hidden rounded border text-center transition ${
            ep.id === currentEpisodeId
              ? "border-obsidian-red bg-obsidian-red/10"
              : "border-white/[0.08] hover:border-white/20"
          } ${ep.locked ? "opacity-80" : ""}`}
        >
          <div className="aspect-[9/16] bg-zinc-900">
            {ep.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ep.thumbnail_url}
                alt={`Episode ${ep.episode_number}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-lg font-semibold text-gray-500">
                {ep.episode_number}
              </div>
            )}
          </div>
          <p className="truncate px-1 py-1 text-sm">{ep.episode_number}</p>
          <ViewCount
            count={getEpisodeDisplayViewCount(ep)}
            className="truncate px-1 pb-1.5 text-[10px] leading-tight text-gray-500 sm:text-xs"
            inline
          />
          {ep.locked && (
            <span className="absolute right-1 top-1 rounded bg-black/70 p-1">
              <svg viewBox="0 0 16 16" className="h-3 w-3 text-gray-300" fill="currentColor">
                <path d="M11 7V5a3 3 0 00-6 0v2H4a1 1 0 00-1 1v5a1 1 0 001 1h8a1 1 0 001-1V8a1 1 0 00-1-1h-1zm-2 0H7V5a1.5 1.5 0 013 0v2z" />
              </svg>
            </span>
          )}
        </WatchEpisodeLink>
      ))}
    </div>
  );

  return (
    <>
      {/* Mobile / tablet: inline below video */}
      <aside className="w-full lg:hidden">
        <Link
          href={`/series/${seriesSlug}`}
          className="inline-flex min-h-11 items-center text-sm text-gray-400 hover:text-obsidian-red"
        >
          &larr; Series page
        </Link>
        <h3 className="rw-section-title mt-3 text-base sm:mt-4 sm:text-sm">Episodes</h3>
        <div className="mt-3">{grid}</div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-20 space-y-3">
          <Link
            href={`/series/${seriesSlug}`}
            className="inline-flex min-h-11 items-center text-sm text-gray-400 hover:text-obsidian-red"
          >
            &larr; Series page
          </Link>
          <h3 className="rw-section-title text-sm">Episodes</h3>
          {grid}
        </div>
      </aside>
    </>
  );
}
