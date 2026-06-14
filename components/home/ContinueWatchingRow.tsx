import { WatchEpisodeLink } from "@/components/watch/WatchEpisodeLink";

export interface ContinueWatchingItem {
  episodeId: string;
  episodeNumber: number;
  thumbnailUrl: string | null;
  posterUrl: string | null;
  seriesTitle: string;
  seriesSlug: string;
  progressSeconds: number;
  durationSeconds?: number | null;
}

interface ContinueWatchingRowProps {
  items: ContinueWatchingItem[];
}

function formatProgress(progress: number, duration?: number | null): number {
  if (duration && duration > 0) {
    return Math.min(100, Math.round((progress / duration) * 100));
  }
  return Math.min(100, Math.round(progress / 6));
}

export function ContinueWatchingRow({ items }: ContinueWatchingRowProps) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4 sm:space-y-5">
      <h2 className="rw-section-title">Continue Watching</h2>
      <div className="rw-scroll-x gap-4 sm:gap-5">
        {items.map((item) => {
          const image = item.thumbnailUrl ?? item.posterUrl;
          const pct = formatProgress(item.progressSeconds, item.durationSeconds);

          return (
            <WatchEpisodeLink
              key={item.episodeId}
              episodeId={item.episodeId}
              className="group w-[8.75rem] shrink-0 sm:w-48 lg:w-52"
            >
              <div className="rw-card rw-card-hover rw-card-media relative aspect-[9/16]">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt={`${item.seriesTitle} episode ${item.episodeNumber}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-zinc-900 text-sm font-semibold text-zinc-500">
                    Ep {item.episodeNumber}
                  </div>
                )}
                <span className="absolute left-2 top-2 rounded bg-black/75 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Ep {item.episodeNumber}
                </span>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                  <div
                    className="h-full bg-obsidian-red"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </div>
              </div>
              <p className="rw-card-title mt-2.5">{item.seriesTitle}</p>
              <p className="rw-card-subtitle mt-0.5">Resume episode {item.episodeNumber}</p>
            </WatchEpisodeLink>
          );
        })}
      </div>
    </section>
  );
}
