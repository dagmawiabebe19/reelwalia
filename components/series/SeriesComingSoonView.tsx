import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { ComingSoonBadge } from "@/components/series/ComingSoonBadge";
import { ComingSoonPosterArt } from "@/components/series/ComingSoonPosterArt";
import { WatchlistButton } from "@/components/series/WatchlistButton";
import { formatGenreLabel } from "@/lib/coming-soon-poster";
import type { Series } from "@/lib/types/database";

interface SeriesComingSoonViewProps {
  series: Pick<
    Series,
    "id" | "title" | "slug" | "description" | "genre" | "poster_url"
  >;
  inWatchlist: boolean;
}

export function SeriesComingSoonView({
  series,
  inWatchlist,
}: SeriesComingSoonViewProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-[280px_1fr]">
          <div className="relative mx-auto aspect-[9/16] w-full max-w-xs overflow-hidden rounded-xl border border-white/10 lg:max-w-none">
            {series.poster_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={series.poster_url}
                  alt=""
                  className="h-full w-full object-cover opacity-90"
                />
                <ComingSoonBadge
                  size="md"
                  className="absolute left-2 top-2 z-10"
                />
              </>
            ) : (
              <ComingSoonPosterArt
                title={series.title}
                genres={series.genre}
                badgeSize="md"
                titleClassName="text-xl sm:text-2xl"
              />
            )}
          </div>

          <div className="text-center lg:text-left">
            {series.genre?.length > 0 && (
              <p className="rw-genre-label">{formatGenreLabel(series.genre)}</p>
            )}
            <h1 className="rw-page-title mt-2">{series.title}</h1>
            <p className="mt-2 text-sm text-gray-400">
              Status: <span className="text-white">Coming Soon</span>
            </p>

            <div className="mt-4 flex justify-center lg:justify-start">
              <ComingSoonBadge size="md" className="inline-block" />
            </div>

            {series.description && (
              <p className="rw-body mt-6 max-w-2xl">{series.description}</p>
            )}

            <p className="mt-6 text-sm leading-relaxed text-gray-400">
              Episodes will be released soon. Add to your watchlist to be notified
              when they go live.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
              <WatchlistButton
                seriesId={series.id}
                initialInWatchlist={inWatchlist}
                addLabel="Get Notified When Released"
                inWatchlistLabel="You'll Be Notified"
              />
              <Link href="/" className="rw-btn-secondary inline-flex min-h-11 items-center">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
