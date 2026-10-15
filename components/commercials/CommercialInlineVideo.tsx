"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { PLAY_VISIBILITY, useCommercialPlayback } from "@/components/commercials/CommercialPlayback";
import { MutedIcon, SoundOnIcon } from "@/components/video/SoundIcons";
import type { Commercial } from "@/lib/commercials/constants";

/** Start fetching a little before the card scrolls into view. */
const NEAR_MARGIN = "200px 0px";
const VISIBILITY_STEPS = [0, 0.25, PLAY_VISIBILITY, 0.75, 1];
const HINT_MS = 3500;

export interface InlineVideoState {
  /** Frames are on screen (playing or paused on a frame). */
  playing: boolean;
  /** Not autoplaying (reduced motion, Save-Data, or the browser refused): show poster + play button. */
  idle: boolean;
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/**
 * Muted, looping, inline commercial video with a poster underneath. Mounts the
 * <video> only once it is near the viewport (or immediately with `priority`),
 * and plays only while the page's playback coordinator says so.
 */
export function CommercialInlineVideo({
  commercial,
  priority = false,
  hint = false,
  className = "",
  style,
  toggleClassName = "bottom-2 right-2",
  overlay,
}: {
  commercial: Commercial;
  priority?: boolean;
  hint?: boolean;
  className?: string;
  style?: CSSProperties;
  toggleClassName?: string;
  overlay?: (state: InlineVideoState) => ReactNode;
}) {
  const id = useId();
  const playback = useCommercialPlayback();
  const { autoplay, register, reportVisibility, toggleSound, releaseSound } = playback;
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(priority);
  const [active, setActive] = useState(false);
  const [started, setStarted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const hintShown = useRef(false);
  const unmuted = playback.soundId === id;
  const mountVideo = priority || (autoplay && near);

  useEffect(() => register(id, { getVideo: () => videoRef.current, setActive }), [id, register]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const visibility = new IntersectionObserver(
      ([entry]) => reportVisibility(id, entry.isIntersecting ? entry.intersectionRatio : 0),
      { threshold: VISIBILITY_STEPS }
    );
    visibility.observe(root);
    let nearby: IntersectionObserver | null = null;
    if (!priority) {
      nearby = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          setNear(true);
          nearby?.disconnect();
        },
        { rootMargin: NEAR_MARGIN }
      );
      nearby.observe(root);
    }
    return () => {
      visibility.disconnect();
      nearby?.disconnect();
    };
  }, [id, priority, reportVisibility]);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch((err: unknown) => {
      if (isAbort(err)) return;
      if (!video.muted) {
        // Sound was refused without a fresh tap; fall back to muted rather than freezing.
        releaseSound(id);
        video.muted = true;
        video.play().catch((retryErr: unknown) => {
          if (!isAbort(retryErr)) setBlocked(true);
        });
        return;
      }
      setBlocked(true);
    });
  }, [id, releaseSound]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active && autoplay && !blocked) play();
    else if (!video.paused) video.pause();
  }, [active, autoplay, blocked, mountVideo, play]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    if (!unmuted) video.muted = true;
  }, [mountVideo, unmuted]);

  useEffect(() => {
    if (!hint || !started || hintShown.current) return;
    hintShown.current = true;
    setHintVisible(true);
    const timer = window.setTimeout(() => setHintVisible(false), HINT_MS);
    return () => window.clearTimeout(timer);
  }, [hint, started]);

  const onToggleSound = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    setHintVisible(false);
    if (toggleSound(id) && video.paused) play();
  };

  const showVideo = started && !blocked;
  const idle = !autoplay || blocked;

  return (
    <div ref={rootRef} className={`relative overflow-hidden ${className}`} style={style}>
      {commercial.thumbnail_url && !thumbFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={commercial.thumbnail_url}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setThumbFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(229,57,53,0.35),transparent_65%),linear-gradient(160deg,#1a0a0a,#0A0A0A)]" />
      )}

      {mountVideo && (
        <video
          ref={videoRef}
          src={commercial.video_url}
          poster={commercial.thumbnail_url ?? undefined}
          muted
          loop
          playsInline
          preload={autoplay ? (priority ? "auto" : "metadata") : "none"}
          aria-hidden
          tabIndex={-1}
          onPlaying={() => {
            setStarted(true);
            setBlocked(false);
          }}
          onError={() => setBlocked(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            showVideo ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {overlay?.({ playing: showVideo, idle })}

      {showVideo && (
        <>
          {hint && (
            <span
              className={`pointer-events-none absolute z-20 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white ring-1 ring-white/20 backdrop-blur-sm transition-opacity duration-700 ${toggleClassName} mr-14 mb-2 ${
                hintVisible ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden
            >
              Tap for sound
            </span>
          )}
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={unmuted ? `Mute ${commercial.title}` : `Unmute ${commercial.title}`}
            aria-pressed={unmuted}
            className={`commercial-sound-toggle absolute z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white shadow-[0_2px_10px_rgba(0,0,0,0.5)] ring-1 ring-white/25 backdrop-blur-sm transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${toggleClassName}`}
          >
            {unmuted ? <SoundOnIcon /> : <MutedIcon />}
          </button>
        </>
      )}
    </div>
  );
}
