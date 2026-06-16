import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { WatchEpisodeLink } from "@/components/watch/WatchEpisodeLink";
import { PaywallOpenProvider } from "@/components/watch/PaywallOpenContext";
import { SubscribeBanner } from "@/components/watch/SubscribeBanner";
import { WatchlistButton } from "@/components/series/WatchlistButton";
import { SeriesComingSoonView } from "@/components/series/SeriesComingSoonView";
import { Card } from "@/components/ui/Card";
import { ViewCount } from "@/components/ui/ViewCount";
import { canWatchEpisode, hasActiveSubscription, resolveFreeEpisodeCount } from "@/lib/access";
import { isComingSoonSeries } from "@/lib/coming-soon";
import { getEpisodeDisplayViewCount } from "@/lib/episode-view-count";
import { normalizeSeriesOrientation } from "@/lib/series-orientation";
import { createClient } from "@/lib/supabase/server";

interface SeriesPageProps {
  params: { slug: string };
}

async function getSeries(slug: string) {
  const supabase = createClient();

  const { data: series } = await supabase
    .from("series")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!series) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let inWatchlist = false;

  if (user) {
    const { data: wl } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", user.id)
      .eq("series_id", series.id)
      .maybeSingle();
    inWatchlist = !!wl;
  }

  if (isComingSoonSeries(series)) {
    return {
      kind: "coming_soon" as const,
      series,
      inWatchlist,
    };
  }

  if (series.status !== "published") return null;

  const { data: episodes } = await supabase
    .from("episodes")
    .select(
      "id, episode_number, title, thumbnail_url, duration_seconds, is_free, display_view_count, view_count"
    )
    .eq("series_id", series.id)
    .order("episode_number", { ascending: true });

  let profile = null;

  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    profile = p;
  }

  const freeCount = resolveFreeEpisodeCount(series.free_episode_count);
  const episodesWithLock = (episodes ?? []).map((ep) => ({
    ...ep,
    locked: !canWatchEpisode(ep.episode_number, freeCount, profile),
    is_free: ep.episode_number <= freeCount,
  }));

  return {
    kind: "published" as const,
    series,
    episodes: episodesWithLock,
    inWatchlist,
    isAuthenticated: !!user,
    isSubscribed: hasActiveSubscription(profile),
  };
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  const { slug } = params;
  const data = await getSeries(slug);

  if (!data) notFound();

  if (data.kind === "coming_soon") {
    return (
      <SeriesComingSoonView
        series={data.series}
        inWatchlist={data.inWatchlist}
      />
    );
  }

  const { series, episodes, inWatchlist, isAuthenticated, isSubscribed } = data;
  const firstEpisode = episodes[0];
  const seriesOrientation = normalizeSeriesOrientation(series.orientation);
  const isLandscapeSeries = seriesOrientation === "landscape";
  const isLandscapeStandaloneFilm = isLandscapeSeries && episodes.length === 1;
  const episodeThumbnailAspectClass = isLandscapeSeries
    ? "aspect-video"
    : "aspect-[9/16]";

  return (
    <PaywallOpenProvider>
      <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl flex-1 overflow-x-hidden px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <Card className="mx-auto aspect-[2/3] w-full max-w-xs overflow-hidden shadow-card-hover lg:max-w-none">
            {series.poster_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={series.poster_url}
                alt={series.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-end bg-gradient-to-b from-zinc-900 to-black p-4">
                <p className="font-display text-2xl uppercase">{series.title}</p>
              </div>
            )}
          </Card>

          <div>
            {series.genre?.length > 0 && (
              <p className="rw-genre-label">{series.genre.join(" · ")}</p>
            )}
            <h1 className="rw-page-title mt-2">{series.title}</h1>
            {series.tagline && (
              <p className="mt-3 text-base leading-relaxed text-zinc-300 sm:text-lg">
                {series.tagline}
              </p>
            )}
            {series.description && (
              <p className="rw-body mt-4 max-w-2xl">{series.description}</p>
            )}
            <ViewCount count={series.view_count} className="mt-2 text-sm text-gray-500" />

            <div className="mt-6 flex flex-wrap gap-3">
              {firstEpisode && (
                <WatchEpisodeLink
                  episodeId={firstEpisode.id}
                  className="rw-btn-primary inline-flex items-center justify-center"
                >
                  Watch Now
                </WatchEpisodeLink>
              )}
              <WatchlistButton seriesId={series.id} initialInWatchlist={inWatchlist} />
            </div>

            {!isLandscapeStandaloneFilm && (
            <section className="mt-10 sm:mt-12">
              <h2 className="rw-section-title">Episodes</h2>
              {!episodes.length ? (
                <p className="mt-4 text-sm text-gray-400">No episodes yet.</p>
              ) : (
                <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {episodes.map((ep) => (
                    <li key={ep.id}>
                      <WatchEpisodeLink
                        episodeId={ep.id}
                        className="group block min-h-11 transition duration-200 hover:opacity-95"
                      >
                        <div
                          className={`rw-card rw-card-hover rw-card-media relative ${episodeThumbnailAspectClass} overflow-hidden rounded-lg bg-zinc-900`}
                        >
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
                          <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-xs font-semibold text-white">
                            {ep.episode_number}
                          </span>
                          {ep.is_free ? (
                            <span className="absolute right-2 top-2 text-xs font-medium uppercase text-obsidian-red">
                              Free
                            </span>
                          ) : ep.locked ? (
                            <span className="absolute right-2 top-2 rounded bg-black/70 p-1">
                              <svg
                                viewBox="0 0 16 16"
                                className="h-3 w-3 text-gray-300"
                                fill="currentColor"
                              >
                                <path d="M11 7V5a3 3 0 00-6 0v2H4a1 1 0 00-1 1v5a1 1 0 001 1h8a1 1 0 001-1V8a1 1 0 00-1-1h-1zm-2 0H7V5a1.5 1.5 0 013 0v2z" />
                              </svg>
                            </span>
                          ) : null}
                        </div>
                        <p className="rw-caption mt-2">
                          Episode {ep.episode_number}
                        </p>
                        <p className="line-clamp-2 text-sm font-semibold tracking-tight text-white">
                          {ep.title}
                        </p>
                        {ep.duration_seconds != null && ep.duration_seconds > 0 && (
                          <p className="rw-caption mt-0.5">
                            {Math.floor(ep.duration_seconds / 60)}:
                            {String(ep.duration_seconds % 60).padStart(2, "0")}
                          </p>
                        )}
                        <ViewCount
                          count={getEpisodeDisplayViewCount(ep)}
                          className="rw-caption mt-0.5"
                        />
                      </WatchEpisodeLink>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            )}
          </div>
        </div>
      </main>
      <Footer />
      {firstEpisode && !isSubscribed && (
        <SubscribeBanner
          episodeId={firstEpisode.id}
          seriesSlug={series.slug}
          isAuthenticated={isAuthenticated}
        />
      )}
    </div>
    </PaywallOpenProvider>
  );
}
