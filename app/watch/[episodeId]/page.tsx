import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
import { TopNav } from "@/components/layout/TopNav";
import { ViewCount } from "@/components/ui/ViewCount";
import { EpisodePicker } from "@/components/watch/EpisodePicker";
import { MobileVerticalFeed } from "@/components/watch/MobileVerticalFeed";
import { WatchPaywall } from "@/components/watch/WatchPaywall";
import { WatchPostCheckout } from "@/components/watch/WatchPostCheckout";
import { WatchSeriesInfo } from "@/components/watch/WatchSeriesInfo";
import { PaywallOpenProvider } from "@/components/watch/PaywallOpenContext";
import { SubscribeBanner } from "@/components/watch/SubscribeBanner";
import { MeetTheCharacters } from "@/components/chat/MeetTheCharacters";
import { canWatchEpisode, hasActiveSubscription, isEpisodeFree, resolveFreeEpisodeCount } from "@/lib/access";
import { listActiveCharactersForSeries } from "@/lib/chat/server";
import { getSignedCaptionTracksForEpisode } from "@/lib/captions/server";
import { getEpisodeDisplayViewCount } from "@/lib/episode-view-count";
import { getNextEpisode } from "@/lib/episodes";
import { normalizeSeriesOrientation } from "@/lib/series-orientation";
import { resolveInitialProgress } from "@/lib/watch-progress";
import { shouldAutoStartWatch } from "@/lib/watch-playback";
import { verifyCheckoutSession } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

interface WatchPageProps {
  params: { episodeId: string };
  searchParams: { subscribed?: string; session_id?: string; autoplay?: string };
}

async function getWatchData(
  episodeId: string,
  searchParams: { subscribed?: string; session_id?: string; autoplay?: string }
) {
  const supabase = createClient();

  const { data: episode } = await supabase
    .from("episodes")
    .select(
      "id, episode_number, title, description, video_url, thumbnail_url, subtitle_url, view_count, display_view_count, series_id"
    )
    .eq("id", episodeId)
    .maybeSingle();

  if (!episode) return null;

  const { data: series } = await supabase
    .from("series")
    .select(
      "id, title, slug, description, genre, view_count, free_episode_count, status, poster_url, banner_url, orientation"
    )
    .eq("id", episode.series_id)
    .maybeSingle();

  if (!series || series.status !== "published") return null;

  const { data: allEpisodes } = await supabase
    .from("episodes")
    .select(
      "id, episode_number, title, description, thumbnail_url, display_view_count, view_count, video_url"
    )
    .eq("series_id", series.id)
    .order("episode_number", { ascending: true });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  let initialProgress = 0;
  const isBingeNavigation = searchParams.autoplay === "true";

  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    profile = p;

    const { data: history } = await supabase
      .from("watch_history")
      .select("progress_seconds, completed")
      .eq("user_id", user.id)
      .eq("episode_id", episodeId)
      .maybeSingle();
    initialProgress = resolveInitialProgress(history, isBingeNavigation);
  }

  const freeCount = resolveFreeEpisodeCount(series.free_episode_count);
  const isFreeEpisode = isEpisodeFree(episode.episode_number, freeCount);

  let guestSessionUnlock = false;
  if (!isFreeEpisode && searchParams.session_id) {
    const verified = await verifyCheckoutSession(searchParams.session_id);
    guestSessionUnlock = verified?.active === true;
  }

  const unlocked =
    isFreeEpisode ||
    guestSessionUnlock ||
    hasActiveSubscription(profile);
  const isSubscribed = hasActiveSubscription(profile) || guestSessionUnlock;
  // Paywall only for premium episodes without access — never gate free content
  const locked = !isFreeEpisode && !unlocked;

  const nextEp = getNextEpisode(allEpisodes ?? [], episodeId);

  const { data: otherSeries } = await supabase
    .from("series")
    .select("id, title, slug, tagline, poster_url, genre")
    .eq("status", "published")
    .neq("id", series.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const pickerEpisodes = (allEpisodes ?? []).map((ep) => ({
    id: ep.id,
    episode_number: ep.episode_number,
    title: ep.title,
    description: ep.description,
    thumbnail_url: ep.thumbnail_url,
    display_view_count: ep.display_view_count,
    view_count: ep.view_count,
    locked: !canWatchEpisode(ep.episode_number, freeCount, profile),
  }));

  // Feed props: never send video_url for locked episodes
  const feedEpisodes = (allEpisodes ?? []).map((ep) => {
    const canWatch =
      isSubscribed || canWatchEpisode(ep.episode_number, freeCount, profile);
    return {
      id: ep.id,
      episodeNumber: ep.episode_number,
      title: ep.title,
      description: ep.description,
      thumbnailUrl: ep.thumbnail_url,
      locked: !canWatch,
      videoUrl: canWatch ? ep.video_url : null,
    };
  });

  const nextEpisode = nextEp
    ? {
        id: nextEp.id,
        episodeNumber: nextEp.episode_number,
        title: nextEp.title,
        description: nextEp.description,
        thumbnailUrl: nextEp.thumbnail_url,
        locked: !canWatchEpisode(nextEp.episode_number, freeCount, profile),
      }
    : null;

  const totalSeriesViews = (allEpisodes ?? []).reduce(
    (sum, ep) => sum + (getEpisodeDisplayViewCount(ep) ?? 0),
    0
  );

  const captionTracks =
    unlocked ? await getSignedCaptionTracksForEpisode(episodeId) : [];

  const characters = await listActiveCharactersForSeries(supabase, series.id);

  return {
    episode,
    series,
    totalSeriesViews,
    unlocked,
    locked,
    isFreeEpisode,
    isAuthenticated: !!user,
    isSubscribed,
    justSubscribed: searchParams.subscribed === "true",
    autoPlay: shouldAutoStartWatch(unlocked, !!episode.video_url),
    nextEpisode,
    pickerEpisodes,
    feedEpisodes,
    otherSeries: otherSeries ?? [],
    initialProgress,
    captionTracks,
    characters,
  };
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { episodeId } = params;
  const data = await getWatchData(episodeId, searchParams);

  if (!data) notFound();

  const {
    episode,
    series,
    totalSeriesViews,
    unlocked,
    locked,
    isFreeEpisode,
    isAuthenticated,
    isSubscribed,
    justSubscribed,
    autoPlay,
    nextEpisode,
    pickerEpisodes,
    feedEpisodes,
    otherSeries,
    initialProgress,
    captionTracks,
    characters,
  } = data;

  const seriesOrientation = normalizeSeriesOrientation(series.orientation);
  const isLandscapeStandaloneFilm =
    seriesOrientation === "landscape" && pickerEpisodes.length === 1;

  const meetSection = (
    <MeetTheCharacters
      characters={characters}
      seriesSlug={series.slug}
      seriesPosterUrl={series.poster_url ?? series.banner_url ?? null}
      seriesTitle={series.title}
      episodeNumber={episode.episode_number}
      isAuthenticated={isAuthenticated}
    />
  );

  if (seriesOrientation === "landscape") {
    return (
      <PaywallOpenProvider>
        <div
          className={`min-h-screen overflow-x-hidden bg-black ${
            !isSubscribed ? "pb-28 lg:pb-0" : ""
          }`}
        >
          <TopNav />
          <main
            className={`mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:py-6 lg:px-6 ${
              isLandscapeStandaloneFilm ? "" : "lg:flex-row lg:gap-6"
            }`}
          >
            <div
              className={`flex min-w-0 flex-col gap-3 ${
                isLandscapeStandaloneFilm ? "mx-auto w-full max-w-[1000px]" : "flex-1"
              }`}
            >
              <header className="w-full space-y-2">
                <h1 className="font-display text-xl uppercase leading-tight tracking-wide text-white sm:text-2xl">
                  {series.title}
                </h1>
                {(series.genre ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(series.genre ?? []).map((genre: string) => (
                      <span
                        key={genre}
                        className="rounded-full border border-obsidian-red/40 px-2 py-0.5 text-xs uppercase tracking-wide text-obsidian-red"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
                {!isLandscapeStandaloneFilm && (
                  <p className="rw-caption">
                    Episode {episode.episode_number}
                    <ViewCount
                      count={getEpisodeDisplayViewCount(episode)}
                      inline
                      prefix=" · "
                    />
                  </p>
                )}
                {series.description && (
                  <p className="max-w-2xl text-sm leading-relaxed text-gray-300">
                    {series.description}
                  </p>
                )}
              </header>

              <WatchPostCheckout
                unlocked={unlocked}
                locked={locked}
                isAuthenticated={isAuthenticated}
              />

              {unlocked && episode.video_url ? (
                <>
                  {justSubscribed && isAuthenticated && (
                    <p className="w-full rounded-lg border border-obsidian-red/30 bg-obsidian-red/10 px-4 py-2 text-center text-sm text-obsidian-red">
                      Subscription active — enjoy full access!
                    </p>
                  )}
                  <div className="mx-auto flex w-full max-w-[1000px] flex-col">
                    <VideoPlayer
                      src={episode.video_url}
                      poster={episode.thumbnail_url}
                      captionTracks={captionTracks}
                      episodeId={episode.id}
                      episodeNumber={episode.episode_number}
                      seriesId={series.id}
                      seriesSlug={series.slug}
                      seriesTitle={series.title}
                      seriesOrientation={seriesOrientation}
                      isFreeEpisode={isFreeEpisode}
                      isSubscribed={isSubscribed}
                      nextEpisode={nextEpisode}
                      otherSeries={otherSeries}
                      initialProgress={initialProgress}
                      autoPlay={autoPlay}
                      isAuthenticated={isAuthenticated}
                    />
                    {!isSubscribed && (
                      <SubscribeBanner
                        episodeId={episode.id}
                        seriesSlug={series.slug}
                        isAuthenticated={isAuthenticated}
                        placement="below-player"
                      />
                    )}
                  </div>
                </>
              ) : (
                <WatchPaywall
                  episodeId={episode.id}
                  seriesSlug={series.slug}
                  posterUrl={episode.thumbnail_url ?? series.poster_url ?? null}
                  seriesTitle={series.title}
                  episodeNumber={episode.episode_number}
                  showPaywall={locked}
                  isAuthenticated={isAuthenticated}
                />
              )}

              <div className="mt-2 w-full">{meetSection}</div>
            </div>

            {!isLandscapeStandaloneFilm && (
              <div className="lg:shrink-0">
                <EpisodePicker
                  episodes={pickerEpisodes}
                  currentEpisodeId={episode.id}
                  seriesSlug={series.slug}
                />
              </div>
            )}
          </main>
        </div>
      </PaywallOpenProvider>
    );
  }

  return (
    <PaywallOpenProvider>
      <div
        className={`overflow-x-hidden bg-black ${
          !isSubscribed ? "pb-28 md:pb-0 lg:pb-0" : ""
        } min-h-screen max-md:h-[100dvh] max-md:overflow-hidden md:h-auto md:overflow-x-hidden`}
      >
        <div className="max-md:hidden">
          <TopNav />
        </div>
        {/* Mobile vertical feed — full-viewport TikTok-style */}
        <div className="md:hidden">
          <MobileVerticalFeed
            episodes={feedEpisodes}
            initialEpisodeId={episode.id}
            seriesId={series.id}
            seriesSlug={series.slug}
            seriesTitle={series.title}
            seriesPosterUrl={series.poster_url ?? series.banner_url ?? null}
            seriesOrientation={seriesOrientation}
            isAuthenticated={isAuthenticated}
            isSubscribed={isSubscribed}
            initialProgress={initialProgress}
            captionTracks={captionTracks}
            otherSeries={otherSeries}
          />
        </div>

        <main className="mx-auto hidden max-w-6xl flex-col gap-6 px-4 py-4 sm:py-6 md:flex lg:flex-row lg:px-6">
          {/* Primary column — desktop / tablet classic player */}
          <div className="flex w-full min-w-0 flex-1 flex-col gap-4 lg:items-center">
            <div className="flex w-full flex-col items-center gap-4">
              <WatchPostCheckout
                unlocked={unlocked}
                locked={locked}
                isAuthenticated={isAuthenticated}
              />
              {unlocked && episode.video_url ? (
                <>
                  {justSubscribed && isAuthenticated && (
                    <p className="w-full max-w-md rounded-lg border border-obsidian-red/30 bg-obsidian-red/10 px-4 py-2 text-center text-sm text-obsidian-red lg:max-w-none">
                      Subscription active — enjoy full access!
                    </p>
                  )}
                  <VideoPlayer
                    src={episode.video_url}
                    poster={episode.thumbnail_url}
                    captionTracks={captionTracks}
                    episodeId={episode.id}
                    episodeNumber={episode.episode_number}
                    seriesId={series.id}
                    seriesSlug={series.slug}
                    seriesTitle={series.title}
                    seriesOrientation={seriesOrientation}
                    isFreeEpisode={isFreeEpisode}
                    isSubscribed={isSubscribed}
                    nextEpisode={nextEpisode}
                    otherSeries={otherSeries}
                    initialProgress={initialProgress}
                    autoPlay={autoPlay}
                    isAuthenticated={isAuthenticated}
                  />
                </>
              ) : (
                <WatchPaywall
                  episodeId={episode.id}
                  seriesSlug={series.slug}
                  posterUrl={episode.thumbnail_url ?? series.poster_url ?? null}
                  seriesTitle={series.title}
                  episodeNumber={episode.episode_number}
                  showPaywall={locked}
                  isAuthenticated={isAuthenticated}
                />
              )}
            </div>

            <div className="w-full max-w-md lg:max-w-none">{meetSection}</div>

            <WatchSeriesInfo
              title={series.title}
              genres={series.genre ?? []}
              totalViews={totalSeriesViews}
              description={series.description}
              className="w-full max-w-md lg:max-w-none"
            />

            <div className="w-full max-w-md lg:max-w-none">
              <h1 className="font-display text-xl uppercase leading-tight tracking-wide text-white sm:text-2xl">
                {episode.title}
              </h1>
              <p className="rw-caption mt-1.5">
                Episode {episode.episode_number}
                <ViewCount
                  count={getEpisodeDisplayViewCount(episode)}
                  inline
                  prefix=" · "
                />
              </p>
              {episode.description && (
                <p className="rw-body mt-4">{episode.description}</p>
              )}
            </div>
          </div>

          <div className="w-full shrink-0 lg:w-auto">
            <EpisodePicker
              episodes={pickerEpisodes}
              currentEpisodeId={episode.id}
              seriesSlug={series.slug}
            />
          </div>
        </main>
        {!isSubscribed && (
          <SubscribeBanner
            episodeId={episode.id}
            seriesSlug={series.slug}
            isAuthenticated={isAuthenticated}
          />
        )}
      </div>
    </PaywallOpenProvider>
  );
}
