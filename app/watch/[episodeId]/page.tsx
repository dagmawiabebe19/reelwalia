import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
import { TopNav } from "@/components/layout/TopNav";
import { ViewCount } from "@/components/ui/ViewCount";
import { EpisodePicker } from "@/components/watch/EpisodePicker";
import { WatchPaywall } from "@/components/watch/WatchPaywall";
import { WatchPostCheckout } from "@/components/watch/WatchPostCheckout";
import { WatchSeriesInfo } from "@/components/watch/WatchSeriesInfo";
import { PaywallOpenProvider } from "@/components/watch/PaywallOpenContext";
import { SubscribeBanner } from "@/components/watch/SubscribeBanner";
import { canWatchEpisode, hasActiveSubscription, isEpisodeFree, resolveFreeEpisodeCount } from "@/lib/access";
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
      "id, title, slug, description, genre, view_count, free_episode_count, status, poster_url, orientation"
    )
    .eq("id", episode.series_id)
    .maybeSingle();

  if (!series || series.status !== "published") return null;

  const { data: allEpisodes } = await supabase
    .from("episodes")
    .select(
      "id, episode_number, title, description, thumbnail_url, display_view_count, view_count"
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
    ...ep,
    locked: !canWatchEpisode(ep.episode_number, freeCount, profile),
  }));

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
    otherSeries: otherSeries ?? [],
    initialProgress,
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
    otherSeries,
    initialProgress,
  } = data;

  const seriesOrientation = normalizeSeriesOrientation(series.orientation);

  return (
    <PaywallOpenProvider>
      <div className="min-h-screen overflow-x-hidden bg-black">
        <TopNav />
        <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-4 sm:py-6 lg:flex-row lg:px-6">
        <div className="contents lg:flex lg:w-full lg:flex-1 lg:flex-col lg:items-center lg:gap-4">
          <div className="order-1 flex w-full flex-col items-center gap-4">
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
                <div
                  className={
                    seriesOrientation === "landscape"
                      ? "relative mx-auto w-full max-w-md"
                      : "contents"
                  }
                >
                  <VideoPlayer
                    src={episode.video_url}
                    poster={episode.thumbnail_url}
                    subtitleUrl={episode.subtitle_url}
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
                  {seriesOrientation === "landscape" && !isSubscribed && (
                    <SubscribeBanner
                      episodeId={episode.id}
                      seriesSlug={series.slug}
                      isAuthenticated={isAuthenticated}
                      placement="player"
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
          </div>

          <WatchSeriesInfo
            title={series.title}
            genres={series.genre ?? []}
            totalViews={totalSeriesViews}
            description={series.description}
            className="order-3 lg:order-none"
          />

          <div className="order-4 w-full max-w-md lg:order-none lg:max-w-none">
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

        <div className="order-2 lg:order-none lg:shrink-0">
          <EpisodePicker
            episodes={pickerEpisodes}
            currentEpisodeId={episode.id}
            seriesSlug={series.slug}
          />
        </div>
      </main>
      {!isSubscribed && seriesOrientation !== "landscape" && (
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
