import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
import { TopNav } from "@/components/layout/TopNav";
import { EpisodePicker } from "@/components/watch/EpisodePicker";
import { WatchPaywall } from "@/components/watch/WatchPaywall";
import { WatchPostCheckout } from "@/components/watch/WatchPostCheckout";
import { canWatchEpisode, hasActiveSubscription, isEpisodeFree } from "@/lib/access";
import { verifyCheckoutSession } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

interface WatchPageProps {
  params: { episodeId: string };
  searchParams: { subscribed?: string; session_id?: string };
}

async function getWatchData(
  episodeId: string,
  searchParams: { subscribed?: string; session_id?: string }
) {
  const supabase = createClient();

  const { data: episode } = await supabase
    .from("episodes")
    .select(
      "id, episode_number, title, description, video_url, thumbnail_url, subtitle_url, view_count, series_id"
    )
    .eq("id", episodeId)
    .maybeSingle();

  if (!episode) return null;

  const { data: series } = await supabase
    .from("series")
    .select(
      "id, title, slug, description, view_count, free_episode_count, status, poster_url"
    )
    .eq("id", episode.series_id)
    .maybeSingle();

  if (!series || series.status !== "published") return null;

  const { data: allEpisodes } = await supabase
    .from("episodes")
    .select("id, episode_number, title, thumbnail_url")
    .eq("series_id", series.id)
    .order("episode_number", { ascending: true });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  let initialProgress = 0;

  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    profile = p;

    const { data: history } = await supabase
      .from("watch_history")
      .select("progress_seconds")
      .eq("user_id", user.id)
      .eq("episode_id", episodeId)
      .maybeSingle();
    initialProgress = history?.progress_seconds ?? 0;
  }

  const freeCount = series.free_episode_count ?? 5;
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
  // Paywall only for premium episodes without access — never gate free content
  const locked = !isFreeEpisode && !unlocked;

  const currentIndex = (allEpisodes ?? []).findIndex((e) => e.id === episodeId);
  const nextEpisode =
    currentIndex >= 0 && allEpisodes && currentIndex < allEpisodes.length - 1
      ? allEpisodes[currentIndex + 1]
      : null;

  const pickerEpisodes = (allEpisodes ?? []).map((ep) => ({
    ...ep,
    locked: !canWatchEpisode(ep.episode_number, freeCount, profile),
  }));

  return {
    episode,
    series,
    unlocked,
    locked,
    isAuthenticated: !!user,
    justSubscribed: searchParams.subscribed === "true",
    nextEpisodeId: nextEpisode?.id ?? null,
    pickerEpisodes,
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
    unlocked,
    locked,
    isAuthenticated,
    justSubscribed,
    nextEpisodeId,
    pickerEpisodes,
    initialProgress,
  } = data;

  return (
    <div className="min-h-screen overflow-x-hidden bg-black">
      <TopNav />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-4 sm:py-6 lg:flex-row lg:px-6">
        <div className="flex w-full flex-1 flex-col items-center gap-4">
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
                subtitleUrl={episode.subtitle_url}
                episodeId={episode.id}
                seriesId={series.id}
                nextEpisodeId={nextEpisodeId}
                initialProgress={initialProgress}
              />
            </>
          ) : (
            <WatchPaywall
              episodeId={episode.id}
              posterUrl={episode.thumbnail_url ?? series.poster_url ?? null}
              seriesTitle={series.title}
              episodeNumber={episode.episode_number}
              showPaywall={locked}
              isAuthenticated={isAuthenticated}
            />
          )}

          <div className="w-full max-w-md lg:max-w-none">
            <Link
              href={`/series/${series.slug}`}
              className="inline-flex min-h-11 items-center text-sm text-gray-400 hover:text-obsidian-red"
            >
              {series.title}
            </Link>
            <h1 className="mt-1 font-display text-xl uppercase sm:text-2xl">
              {episode.title}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Episode {episode.episode_number} ·{" "}
              {(episode.view_count ?? 0).toLocaleString()} views
            </p>
            {(episode.description || series.description) && (
              <p className="mt-3 text-base leading-relaxed text-gray-400">
                {episode.description ?? series.description}
              </p>
            )}
          </div>
        </div>

        <EpisodePicker
          episodes={pickerEpisodes}
          currentEpisodeId={episode.id}
          seriesSlug={series.slug}
        />
      </main>
    </div>
  );
}
