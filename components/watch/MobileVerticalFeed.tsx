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
import { isMobileViewport } from "@/lib/landscape-rotate-fullscreen";
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

/** Lightweight next-episode buffer — metadata only, no autoplay. */
function NextEpisodePreload({ src }: { src: string }) {
  return (
    <video
      src={src}
      preload="metadata"
      muted
      playsInline
      className="pointer-events-none absolute h-0 w-0 opacity-0"
      aria-hidden
      tabIndex={-1}
    />
  );
}

/**
 * Mobile TikTok-style vertical episode feed (vertical series only).
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const progressSeedRef = useRef({ id: initialEpisodeId, seconds: initialProgress });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      // Feed is mobile-only; tablet/desktop keep classic player
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
      locked: next.locked,
    };
  }, [activeIndex, episodes]);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const el = slideRefs.current[index];
    if (!el) return;
    el.scrollIntoView({ behavior, block: "start" });
  }, []);

  const goToIndex = useCallback(
    (index: number, opts?: { binge?: boolean; behavior?: ScrollBehavior }) => {
      if (index < 0 || index >= episodes.length) return;
      if (opts?.binge) markBingeContinuation();
      setActiveIndex(index);
      softReplaceWatchUrl(episodes[index].id);
      scrollToIndex(index, opts?.behavior ?? "smooth");
    },
    [episodes, scrollToIndex]
  );

  // IntersectionObserver → active slide
  useEffect(() => {
    if (!useFeed || !ready) return;
    const root = scrollerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isFinite(idx)) continue;
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { index: idx, ratio: entry.intersectionRatio };
          }
        }
        if (best && best.ratio >= 0.55) {
          setActiveIndex((prev) => {
            if (prev === best!.index) return prev;
            softReplaceWatchUrl(episodes[best!.index].id);
            return best!.index;
          });
        }
      },
      { root, threshold: [0.55, 0.75] }
    );

    slideRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [useFeed, ready, episodes]);

  // Jump to initial episode once feed mounts
  useEffect(() => {
    if (!useFeed || !ready) return;
    scrollToIndex(initialIndex, "auto");
  }, [useFeed, ready, initialIndex, scrollToIndex]);

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

  return (
    <div className="relative bg-black">
      <Link
        href={`/series/${seriesSlug}`}
        data-feed-chrome
        className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
        aria-label="Back to series"
      >
        ←
      </Link>

      <div
        ref={scrollerRef}
        className="relative h-[100dvh] w-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain bg-black [-webkit-overflow-scrolling:touch]"
        style={{ scrollSnapType: "y mandatory" }}
      >
      {episodes.map((ep, index) => {
        const isActive = index === activeIndex;
        // Mount active + next only (smooth advance without burning bandwidth)
        const near = index === activeIndex || index === activeIndex + 1;
        return (
          <section
            key={ep.id}
            ref={(node) => {
              slideRefs.current[index] = node;
            }}
            data-index={index}
            className="relative flex h-[100dvh] w-full snap-start snap-always flex-col justify-center"
          >
            {ep.locked || !ep.videoUrl ? (
              <div className="flex h-full w-full items-center justify-center px-4">
                <WatchPaywall
                  episodeId={ep.id}
                  seriesSlug={seriesSlug}
                  posterUrl={ep.thumbnailUrl ?? seriesPosterUrl}
                  seriesTitle={seriesTitle}
                  episodeNumber={ep.episodeNumber}
                  showPaywall={isActive}
                  isAuthenticated={isAuthenticated}
                />
              </div>
            ) : near ? (
              <div className="h-full w-full">
                <VideoPlayer
                  key={ep.id}
                  src={ep.videoUrl}
                  poster={ep.thumbnailUrl}
                  captionTracks={isActive ? captionTracks : []}
                  episodeId={ep.id}
                  episodeNumber={ep.episodeNumber}
                  seriesId={seriesId}
                  seriesSlug={seriesSlug}
                  seriesTitle={seriesTitle}
                  seriesOrientation={seriesOrientation}
                  isFreeEpisode
                  isSubscribed={isSubscribed}
                  nextEpisode={isActive ? nextEpisodeForPlayer : null}
                  otherSeries={otherSeries}
                  initialProgress={
                    isActive && progressSeedRef.current.id === ep.id
                      ? progressSeedRef.current.seconds
                      : 0
                  }
                  autoPlay={isActive}
                  isAuthenticated={isAuthenticated}
                  feedMode
                  fillContainer
                  onFeedAdvance={() => goToIndex(index + 1, { binge: true })}
                  onFeedLockedNext={() => goToIndex(index + 1, { binge: true })}
                />
              </div>
            ) : (
              <div className="relative h-full w-full bg-black">
                {ep.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ep.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover opacity-40"
                  />
                ) : null}
                <p className="absolute bottom-24 left-4 font-display text-lg uppercase text-white/80">
                  Episode {ep.episodeNumber}
                </p>
              </div>
            )}
          </section>
        );
      })}

      {/* Bandwidth-light preload of the next unlocked episode */}
      {nextUnlocked?.videoUrl && active && !active.locked ? (
        <NextEpisodePreload src={nextUnlocked.videoUrl} />
      ) : null}
      </div>
    </div>
  );
}
