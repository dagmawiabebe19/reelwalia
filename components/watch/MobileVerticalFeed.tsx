"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { VideoPlayer, type CaptionTrack, type NextEpisodeData } from "@/components/VideoPlayer";
import { WatchPaywall } from "@/components/watch/WatchPaywall";
import { fsLog, isMobileViewport } from "@/lib/landscape-rotate-fullscreen";
import { markBingeContinuation, watchEpisodeHref } from "@/lib/watch-playback";
import type { SeriesOrientation } from "@/lib/types/database";

export type FeedEpisode = {
  id: string;
  episodeNumber: number;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  /** Null when locked — never expose premium video URLs to the client. */
  videoUrl: string | null;
  locked: boolean;
};

type FeedProps = {
  episodes: FeedEpisode[];
  initialEpisodeId: string;
  seriesId: string;
  seriesSlug: string;
  seriesTitle: string;
  seriesPosterUrl: string | null;
  seriesOrientation: SeriesOrientation;
  isAuthenticated: boolean;
  isSubscribed: boolean;
  initialProgress: number;
  captionTracks: CaptionTrack[];
  otherSeries?: Parameters<typeof VideoPlayer>[0]["otherSeries"];
};

function softReplaceWatchUrl(episodeId: string) {
  try {
    window.history.replaceState(null, "", watchEpisodeHref(episodeId));
  } catch {
    // ignore
  }
}

/** Prefetch next episode metadata without painting any video pixels. */
function NextEpisodePreload({ src }: { src: string }) {
  useEffect(() => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.src = src;
    // Never append to the document — avoids iOS painting a strip of the next ep.
    return () => {
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);
  return null;
}

/**
 * Mobile TikTok-style vertical episode feed (vertical series only).
 * Uses ONE stable VideoPlayer so fullscreen survives episode advances
 * (src swap on the same <video>, not remount).
 * Desktop / landscape falls back to a single classic VideoPlayer.
 */
export function MobileVerticalFeed({
  episodes,
  initialEpisodeId,
  seriesId,
  seriesSlug,
  seriesTitle,
  seriesPosterUrl,
  seriesOrientation,
  isAuthenticated,
  isSubscribed,
  initialProgress,
  captionTracks,
  otherSeries = [],
}: FeedProps) {
  const initialIndex = Math.max(
    0,
    episodes.findIndex((ep) => ep.id === initialEpisodeId)
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [useFeed, setUseFeed] = useState(false);
  const [ready, setReady] = useState(false);
  const progressSeedRef = useRef({ id: initialEpisodeId, seconds: initialProgress });
  const captionEpisodeIdRef = useRef(initialEpisodeId);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      setUseFeed(!mq.matches && isMobileViewport());
      setReady(true);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const active = episodes[activeIndex] ?? episodes[0];

  const nextUnlocked = useMemo(() => {
    for (let i = activeIndex + 1; i < episodes.length; i++) {
      if (!episodes[i].locked && episodes[i].videoUrl) return episodes[i];
    }
    return null;
  }, [activeIndex, episodes]);

  const nextEpisodeForPlayer = useMemo((): NextEpisodeData | null => {
    const next = episodes[activeIndex + 1];
    if (!next) return null;
    return {
      id: next.id,
      episodeNumber: next.episodeNumber,
      title: next.title,
      description: next.description,
      thumbnailUrl: next.thumbnailUrl,
      locked: next.locked || !next.videoUrl,
    };
  }, [activeIndex, episodes]);

  const goToIndex = useCallback(
    (index: number, opts?: { binge?: boolean; reason?: string }) => {
      if (index < 0 || index >= episodes.length) return false;
      const target = episodes[index];
      if (opts?.binge) markBingeContinuation();
      setActiveIndex(index);
      softReplaceWatchUrl(target.id);
      fsLog("binge-advance", {
        reason: opts?.reason ?? "go-to-index",
        fromIndex: activeIndex,
        toIndex: index,
        episodeId: target.id,
        locked: target.locked,
        hasUrl: !!target.videoUrl,
      });
      return true;
    },
    [activeIndex, episodes]
  );

  /** Unlocked step — same VideoPlayer, new src. Locked → paywall slide only. */
  const stepEpisode = useCallback(
    (delta: number, reason: string): "ok" | "paywall" | "noop" => {
      const nextIndex = activeIndex + delta;
      if (nextIndex < 0 || nextIndex >= episodes.length) return "noop";
      const target = episodes[nextIndex];

      if (target.locked || !target.videoUrl) {
        if (delta < 0) return "noop";
        goToIndex(nextIndex, { binge: true, reason: `${reason}-paywall` });
        return "paywall";
      }

      goToIndex(nextIndex, { binge: true, reason });
      return "ok";
    },
    [activeIndex, episodes, goToIndex]
  );

  const onFeedAdvance = useCallback(() => {
    stepEpisode(1, "ended");
  }, [stepEpisode]);

  const onFeedLockedNext = useCallback(() => {
    stepEpisode(1, "locked-end");
  }, [stepEpisode]);

  const onFeedStep = useCallback(
    (delta: number) => stepEpisode(delta, delta > 0 ? "swipe-up" : "swipe-down"),
    [stepEpisode]
  );

  if (!ready) {
    return (
      <div className="mx-auto aspect-[9/16] w-full max-w-md rounded-xl bg-zinc-950" />
    );
  }

  // Desktop / tablet: classic single player
  if (!useFeed) {
    const ep = episodes.find((e) => e.id === initialEpisodeId) ?? episodes[initialIndex];
    if (!ep || ep.locked || !ep.videoUrl) {
      return (
        <WatchPaywall
          episodeId={ep?.id ?? initialEpisodeId}
          seriesSlug={seriesSlug}
          posterUrl={ep?.thumbnailUrl ?? seriesPosterUrl}
          seriesTitle={seriesTitle}
          episodeNumber={ep?.episodeNumber ?? 1}
          showPaywall
          isAuthenticated={isAuthenticated}
        />
      );
    }
    const next = episodes[episodes.findIndex((e) => e.id === ep.id) + 1];
    return (
      <VideoPlayer
        src={ep.videoUrl}
        poster={ep.thumbnailUrl}
        captionTracks={captionTracks}
        episodeId={ep.id}
        episodeNumber={ep.episodeNumber}
        seriesId={seriesId}
        seriesSlug={seriesSlug}
        seriesTitle={seriesTitle}
        seriesOrientation={seriesOrientation}
        isFreeEpisode={!ep.locked}
        isSubscribed={isSubscribed}
        nextEpisode={
          next
            ? {
                id: next.id,
                episodeNumber: next.episodeNumber,
                title: next.title,
                description: next.description,
                thumbnailUrl: next.thumbnailUrl,
                locked: next.locked,
              }
            : null
        }
        otherSeries={otherSeries}
        initialProgress={
          progressSeedRef.current.id === ep.id ? progressSeedRef.current.seconds : 0
        }
        autoPlay
        isAuthenticated={isAuthenticated}
      />
    );
  }

  const activeLocked = !active || active.locked || !active.videoUrl;
  const playerCaptions =
    active && active.id === captionEpisodeIdRef.current ? captionTracks : [];

  return (
    <div className="relative isolate h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-black">
      <Link
        href={`/series/${seriesSlug}`}
        data-feed-chrome
        className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
        aria-label="Back to series"
      >
        ←
      </Link>

      {activeLocked ? (
        <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-black px-4">
          <WatchPaywall
            episodeId={active?.id ?? initialEpisodeId}
            seriesSlug={seriesSlug}
            posterUrl={active?.thumbnailUrl ?? seriesPosterUrl}
            seriesTitle={seriesTitle}
            episodeNumber={active?.episodeNumber ?? 1}
            showPaywall
            isAuthenticated={isAuthenticated}
          />
        </div>
      ) : (
        <div className="absolute inset-0 h-full w-full overflow-hidden bg-black">
          {/* Stable key — never remount across episode advances */}
          <VideoPlayer
            key="rw-feed-player"
            src={active.videoUrl!}
            poster={active.thumbnailUrl}
            captionTracks={playerCaptions}
            episodeId={active.id}
            episodeNumber={active.episodeNumber}
            seriesId={seriesId}
            seriesSlug={seriesSlug}
            seriesTitle={seriesTitle}
            seriesOrientation={seriesOrientation}
            isFreeEpisode
            isSubscribed={isSubscribed}
            nextEpisode={nextEpisodeForPlayer}
            otherSeries={otherSeries}
            initialProgress={
              progressSeedRef.current.id === active.id
                ? progressSeedRef.current.seconds
                : 0
            }
            autoPlay
            isAuthenticated={isAuthenticated}
            feedMode
            fillContainer
            onFeedAdvance={onFeedAdvance}
            onFeedLockedNext={onFeedLockedNext}
            onFeedStep={onFeedStep}
          />
        </div>
      )}

      {nextUnlocked?.videoUrl && !activeLocked ? (
        <NextEpisodePreload src={nextUnlocked.videoUrl} />
      ) : null}

      {!activeLocked && (
        <p
          data-feed-chrome
          className="pointer-events-none absolute bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-4 z-40 font-display text-sm uppercase tracking-wide text-white/70"
        >
          Episode {active.episodeNumber}
          {active.title ? ` · ${active.title}` : ""}
        </p>
      )}
    </div>
  );
}
