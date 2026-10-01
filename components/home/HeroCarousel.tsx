"use client";

import Hls from "hls.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { WatchEpisodeLink } from "@/components/watch/WatchEpisodeLink";
import type { Series } from "@/lib/types/database";

type HeroItem = Pick<
  Series,
  "id" | "title" | "slug" | "tagline" | "description" | "banner_url" | "poster_url" | "genre"
> & {
  firstEpisodeId: string | null;
  previewVideoUrl: string | null;
};

const SLIDE_MS = 6000;
const PREVIEW_SLIDE_MS = 20000;
const PREVIEW_START_DELAY_MS = 800;
const DESKTOP_QUERY = "(min-width: 1024px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function useDesktopPreviewAllowed(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const reduced = window.matchMedia(REDUCED_MOTION_QUERY);
    const sync = () => setAllowed(desktop.matches && !reduced.matches);
    sync();
    desktop.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    return () => {
      desktop.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);
  return allowed;
}

function HeroPreviewVideo({
  src,
  muted,
  onPlaying,
  onEnded,
}: {
  src: string;
  muted: boolean;
  onPlaying: () => void;
  onEnded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls: Hls | null = null;
    let cancelled = false;

    const startTimer = window.setTimeout(() => {
      if (cancelled) return;
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      } else if (Hls.isSupported()) {
        hls = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 20 });
        hls.loadSource(src);
        hls.attachMedia(video);
      } else {
        return;
      }
      void video.play().catch(() => undefined);
    }, PREVIEW_START_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  return (
    <video
      ref={videoRef}
      muted={muted}
      playsInline
      preload="none"
      aria-hidden
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        setPortrait(v.videoHeight > v.videoWidth);
      }}
      onPlaying={() => {
        setVisible(true);
        onPlaying();
      }}
      onEnded={onEnded}
      onError={() => setVisible(false)}
      className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${
        portrait ? "object-contain object-[78%_50%]" : "object-cover object-center"
      } ${visible ? "opacity-100" : "opacity-0"}`}
    />
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      {direction === "left" ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 5l-7 7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      )}
    </svg>
  );
}

function heroSynopsis(item: HeroItem): string | null {
  const text = item.description?.trim() || item.tagline?.trim();
  return text || null;
}

interface HeroCarouselProps {
  items: HeroItem[];
}

/** Keep left scrim subtle so faces stay visible. */
const HERO_SCRIM_LEFT =
  "linear-gradient(to right, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0.12) 34%, rgba(0,0,0,0.03) 56%, transparent 74%)";

/** Mobile-only thin bottom scrim band for compact copy area. */
const HERO_SCRIM_BOTTOM_MOBILE =
  "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.62) 14%, rgba(0,0,0,0.22) 25%, transparent 35%)";

/** Desktop/tablet scrim unchanged. */
const HERO_SCRIM_BOTTOM_DESKTOP =
  "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.72) 18%, rgba(0,0,0,0.36) 32%, rgba(0,0,0,0.08) 45%, transparent 58%)";

export function HeroCarousel({ items }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const previewAllowed = useDesktopPreviewAllowed();
  const count = items.length;

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return;
      setPreviewPlaying(false);
      setActiveIndex(((index % count) + count) % count);
    },
    [count]
  );
  const goNext = useCallback(() => goTo(activeIndex + 1), [goTo, activeIndex]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [goTo, activeIndex]);

  const active = items[activeIndex];
  const showPreview = previewAllowed && Boolean(active?.previewVideoUrl);

  // Restart the countdown on every slide change (auto or manual); previews get longer.
  useEffect(() => {
    if (count <= 1) return;
    const timer = window.setTimeout(goNext, showPreview ? PREVIEW_SLIDE_MS : SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [count, activeIndex, showPreview, goNext]);

  if (count === 0 || !active) return null;

  const imageSrc = active.banner_url ?? active.poster_url ?? "";
  const synopsis = heroSynopsis(active);

  return (
    <section className="relative overflow-hidden rounded-xl border border-white/[0.08] shadow-hero-vignette">
      <div className="relative aspect-[16/10] min-h-[280px] w-full bg-zinc-950 sm:aspect-[2/1] sm:min-h-[360px] lg:aspect-[21/9] lg:min-h-[400px]">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={active.id}
            src={imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full animate-subscribe-fade-in object-contain object-center sm:object-cover sm:object-[66%_18%] lg:object-[58%_20%]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black" />
        )}

        {showPreview && active.previewVideoUrl && (
          <HeroPreviewVideo
            key={active.id}
            src={active.previewVideoUrl}
            muted={muted}
            onPlaying={() => setPreviewPlaying(true)}
            onEnded={() => {
              if (count > 1) goNext();
            }}
          />
        )}

        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: HERO_SCRIM_LEFT }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 sm:hidden"
          style={{ background: HERO_SCRIM_BOTTOM_MOBILE }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 hidden sm:block"
          style={{ background: HERO_SCRIM_BOTTOM_DESKTOP }}
          aria-hidden
        />

        <div className="relative z-10 flex h-full flex-col justify-end p-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] sm:p-6 sm:pb-7 sm:pl-[4.25rem] lg:p-7 lg:pb-8 lg:pl-20">
          <div className="rw-hero-copy-panel max-w-[92%] sm:max-w-[30rem] lg:max-w-[34rem]">
            <div className="rw-hero-copy-inner">
              {active.genre?.length > 0 && (
                <p className="rw-genre-label rw-hero-genre mb-1.5 text-[9px] sm:mb-2.5 sm:text-[11px]">
                  {active.genre.slice(0, 2).join(" · ")}
                </p>
              )}
              <h1 className="font-display text-[1.55rem] uppercase leading-[0.94] tracking-[0.015em] text-white sm:text-[2.7rem] lg:text-[3.1rem]">
                {active.title}
              </h1>
              {synopsis && (
                <p className="mt-1.5 line-clamp-1 max-w-[24rem] text-[11px] leading-relaxed text-zinc-200/92 sm:mt-2 sm:line-clamp-2 sm:max-w-[26rem] sm:text-sm">
                  {synopsis}
                </p>
              )}
              <div className="mt-2.5 flex flex-wrap gap-2 sm:mt-4 sm:gap-3">
                {active.firstEpisodeId ? (
                  <WatchEpisodeLink
                    episodeId={active.firstEpisodeId}
                    className="rw-btn-primary min-h-9 min-w-[110px] px-3.5 py-1.5 text-xs sm:min-h-11 sm:min-w-[138px] sm:px-4 sm:py-2 sm:text-sm"
                  >
                    Watch Now
                  </WatchEpisodeLink>
                ) : (
                  <Button
                    href={`/series/${active.slug}`}
                    className="min-h-9 min-w-[110px] px-3.5 py-1.5 text-xs sm:min-h-11 sm:min-w-[138px] sm:px-4 sm:py-2 sm:text-sm"
                  >
                    Watch Now
                  </Button>
                )}
                <Button
                  href={`/series/${active.slug}`}
                  variant="secondary"
                  className="min-h-9 min-w-[102px] px-3.5 py-1.5 text-xs sm:min-h-11 sm:min-w-[128px] sm:px-4 sm:py-2 sm:text-sm"
                >
                  More Info
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous featured series"
            className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-sm transition hover:scale-105 hover:bg-black/70 sm:left-4 sm:h-11 sm:w-11"
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next featured series"
            className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-sm transition hover:scale-105 hover:bg-black/70 sm:right-4 sm:h-11 sm:w-11"
          >
            <ArrowIcon direction="right" />
          </button>
        </>
      )}

      {showPreview && previewPlaying && (
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute preview" : "Mute preview"}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/70 sm:right-6 sm:top-6"
        >
          {muted ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.59 3L19 9.59 17.59 8.17 15.17 10.6 12.76 8.17 11.34 9.59 13.76 12l-2.42 2.41 1.42 1.42 2.41-2.42 2.42 2.42L19 14.41 16.59 12z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05A4.48 4.48 0 0016.5 12zM14 3.23v2.06a7 7 0 010 13.42v2.06A9 9 0 0014 3.23z" />
            </svg>
          )}
        </button>
      )}

      {count > 1 && (
        <div className="absolute bottom-4 right-4 z-10 flex gap-2 sm:bottom-6 sm:right-6">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show ${item.title}`}
              onClick={() => goTo(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? "w-8 bg-obsidian-red"
                  : "w-4 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
