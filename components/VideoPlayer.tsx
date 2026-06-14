"use client";

import Hls from "hls.js";
import { useRouter } from "next/navigation";
import screenfull from "screenfull";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type TouchEvent,
} from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AutoplayOverlay } from "@/components/watch/AutoplayOverlay";
import { EndOfSeriesOverlay } from "@/components/watch/EndOfSeriesOverlay";
import type { Series } from "@/lib/types/database";
import {
  consumeUnmutedIntent,
  persistAudioPreference,
  readPreferUnmuted,
  watchEpisodeHref,
} from "@/lib/watch-playback";

const AUToplay_THRESHOLD = 5;
const FULLSCREEN_STORAGE_KEY = "rw-maintain-fullscreen";

export interface NextEpisodeData {
  id: string;
  episodeNumber: number;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  locked: boolean;
}

type OtherSeriesData = Pick<
  Series,
  "id" | "title" | "slug" | "tagline" | "poster_url" | "genre"
>;

interface VideoPlayerProps {
  src: string;
  poster?: string | null;
  subtitleUrl?: string | null;
  episodeId: string;
  seriesId: string;
  seriesSlug: string;
  seriesTitle: string;
  nextEpisode?: NextEpisodeData | null;
  otherSeries?: OtherSeriesData[];
  initialProgress?: number;
  autoPlay?: boolean;
  isAuthenticated?: boolean;
}

const SPEEDS = [0.5, 1, 1.25, 1.5, 2] as const;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ControlButton({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition md:h-10 md:w-10 ${
        active ? "bg-white/25" : "hover:bg-white/20 active:bg-white/30"
      }`}
    >
      {children}
    </button>
  );
}

export function VideoPlayer({
  src,
  poster,
  subtitleUrl,
  episodeId,
  seriesId,
  seriesSlug,
  seriesTitle,
  nextEpisode = null,
  otherSeries = [],
  initialProgress = 0,
  autoPlay = false,
  isAuthenticated = false,
}: VideoPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownStartedRef = useRef(false);
  const navigatedRef = useRef(false);
  const autoPlayStartedRef = useRef(false);
  const autoPlayInFlightRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [subtitlesOn, setSubtitlesOn] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fitToScreen, setFitToScreen] = useState(false);
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
  const [countdownVisible, setCountdownVisible] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(AUToplay_THRESHOLD);
  const [autoplayCanceled, setAutoplayCanceled] = useState(false);
  const [showEndOfSeries, setShowEndOfSeries] = useState(false);
  const [showTapForSound, setShowTapForSound] = useState(false);

  const attemptAutoPlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !autoPlay || loadError || autoPlayStartedRef.current || autoPlayInFlightRef.current) {
      return false;
    }

    autoPlayInFlightRef.current = true;

    const preferUnmuted = readPreferUnmuted() || consumeUnmutedIntent();
    video.muted = !preferUnmuted;
    setMuted(!preferUnmuted);
    setShowTapForSound(false);

    const tryPlay = () => video.play();

    try {
      await tryPlay();
      autoPlayStartedRef.current = true;
      setPlaying(true);
      setIsInitialLoad(false);
      console.log("[autoplay] play_succeeded");
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
      try {
        await tryPlay();
        autoPlayStartedRef.current = true;
        setPlaying(true);
        setIsInitialLoad(false);
        console.log("[autoplay] play_succeeded");
        return true;
      } catch {
        try {
          video.muted = true;
          setMuted(true);
          await tryPlay();
          autoPlayStartedRef.current = true;
          setPlaying(true);
          setIsInitialLoad(false);
          setShowTapForSound(true);
          console.log("[autoplay] play_blocked", { fallback: "muted" });
          return true;
        } catch {
          setPlaying(false);
          console.log("[autoplay] play_blocked", { fallback: "manual" });
          return false;
        }
      }
    } finally {
      autoPlayInFlightRef.current = false;
    }
  }, [autoPlay, loadError]);

  const saveProgress = useCallback(
    async (progressSeconds: number, completed: boolean) => {
      try {
        await fetch("/api/watch/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            episodeId,
            seriesId,
            progressSeconds: Math.floor(progressSeconds),
            completed,
          }),
        });
      } catch {
        // Non-blocking
      }
    },
    [episodeId, seriesId]
  );

  const bumpControls = useCallback(
    (autoHide = true) => {
      if (loadError) return;
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (autoHide && playing) {
        hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
      }
    },
    [loadError, playing]
  );

  const skip = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = Math.max(
        0,
        Math.min(video.duration || 0, video.currentTime + delta)
      );
      bumpControls();
    },
    [bumpControls]
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().then(() => {
        setPlaying(true);
        if (!video.muted) persistAudioPreference(true);
      });
    } else {
      video.pause();
      setPlaying(false);
    }
    bumpControls(false);
  }, [bumpControls]);

  const retryLoad = useCallback(() => {
    setLoadError(false);
    setIsInitialLoad(true);
    setIsBuffering(true);
    const video = videoRef.current;
    if (!video) return;
    video.load();
    if (hlsRef.current) {
      hlsRef.current.loadSource(src);
    } else {
      video.src = src;
    }
  }, [src]);

  useEffect(() => {
    setLoadError(false);
    setIsInitialLoad(true);
    setIsBuffering(true);
    const video = videoRef.current;
    if (!video) return;

    const canNativeHls =
      video.canPlayType("application/vnd.apple.mpegurl") !== "";

    const onVideoError = () => setLoadError(true);

    if (canNativeHls) {
      video.src = src;
    } else if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error("HLS fatal error:", data);
          setLoadError(true);
        }
      });
    } else {
      video.src = src;
    }

    video.addEventListener("error", onVideoError);

    return () => {
      video.removeEventListener("error", onVideoError);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || initialProgress <= 0) return;

    const onMeta = () => {
      if (video.duration > initialProgress) {
        video.currentTime = initialProgress;
      }
    };

    video.addEventListener("loadedmetadata", onMeta);
    return () => video.removeEventListener("loadedmetadata", onMeta);
  }, [initialProgress]);

  const navigateToNext = useCallback(
    (immediate: boolean) => {
      if (!nextEpisode || nextEpisode.locked || autoplayCanceled || navigatedRef.current) {
        return;
      }
      navigatedRef.current = true;
      const video = videoRef.current;
      if (video && !video.muted) {
        persistAudioPreference(true);
      }
      if (screenfull.isEnabled && screenfull.isFullscreen) {
        sessionStorage.setItem(FULLSCREEN_STORAGE_KEY, "1");
      } else if (isFullscreen) {
        sessionStorage.setItem(FULLSCREEN_STORAGE_KEY, "1");
      }
      console.log("[autoplay] auto_navigated", {
        fromEpisode: episodeId,
        toEpisode: nextEpisode.id,
        immediate,
      });
      router.push(watchEpisodeHref(nextEpisode.id));
    },
    [autoplayCanceled, episodeId, isFullscreen, nextEpisode, router]
  );

  const handleCancelAutoplay = useCallback(() => {
    setAutoplayCanceled(true);
    setCountdownVisible(false);
    countdownStartedRef.current = false;
    console.log("[autoplay] countdown_canceled", { episodeId });
  }, [episodeId]);

  useEffect(() => {
    setAutoplayCanceled(false);
    setCountdownVisible(false);
    setCountdownSeconds(AUToplay_THRESHOLD);
    setShowEndOfSeries(false);
    setShowTapForSound(false);
    navigatedRef.current = false;
    countdownStartedRef.current = false;
    autoPlayStartedRef.current = false;
    autoPlayInFlightRef.current = false;
  }, [episodeId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !screenfull.isEnabled) return;
    if (sessionStorage.getItem(FULLSCREEN_STORAGE_KEY) !== "1") return;
    sessionStorage.removeItem(FULLSCREEN_STORAGE_KEY);
    void screenfull.request(container);
  }, [src]);

  useEffect(() => {
    if (!autoPlay) return;

    let cancelled = false;

    const startAutoPlay = () => {
      if (cancelled || autoPlayStartedRef.current) return;

      const video = videoRef.current;
      if (!video) {
        requestAnimationFrame(startAutoPlay);
        return;
      }

      const onReady = () => {
        if (cancelled) return;
        void attemptAutoPlay();
      };

      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        onReady();
      } else {
        video.addEventListener("loadedmetadata", onReady, { once: true });
      }

      video.addEventListener(
        "canplay",
        () => {
          if (cancelled || !video.paused) return;
          void attemptAutoPlay();
        },
        { once: true }
      );
    };

    startAutoPlay();

    return () => {
      cancelled = true;
    };
  }, [autoPlay, src, episodeId, attemptAutoPlay]);

  useEffect(() => {
    if (!autoPlay) return;

    const container = containerRef.current;
    if (!container) return;

    let touchHandler: (() => void) | null = null;

    const timeoutId = setTimeout(() => {
      const video = videoRef.current;
      if (!video || !video.paused) return;

      touchHandler = () => {
        void attemptAutoPlay();
      };

      container.addEventListener("touchstart", touchHandler, { once: true, passive: true });
      container.addEventListener("click", touchHandler, { once: true });
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      if (touchHandler) {
        container.removeEventListener("touchstart", touchHandler);
        container.removeEventListener("click", touchHandler);
      }
    };
  }, [autoPlay, src, episodeId, attemptAutoPlay]);

  useEffect(() => {
    if (
      !countdownVisible ||
      autoplayCanceled ||
      !nextEpisode ||
      nextEpisode.locked ||
      countdownSeconds > 0
    ) {
      return;
    }
    navigateToNext(false);
  }, [
    autoplayCanceled,
    countdownSeconds,
    countdownVisible,
    navigateToNext,
    nextEpisode,
  ]);

  useEffect(() => {
    if (!playing && countdownVisible) {
      setCountdownVisible(false);
      setCountdownSeconds(AUToplay_THRESHOLD);
      countdownStartedRef.current = false;
    }
  }, [countdownVisible, playing]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused) return;
      void saveProgress(video.currentTime, false);
    }, 5000);
    return () => clearInterval(interval);
  }, [saveProgress]);

  useEffect(() => {
    if (!playing) setShowControls(true);
  }, [playing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const updateOrientation = () => {
      const mobile = window.matchMedia("(max-width: 768px)").matches;
      setIsLandscapeMobile(mobile && window.innerWidth > window.innerHeight);
    };
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  useEffect(() => {
    if (!screenfull.isEnabled) return;

    const onChange = () => {
      const active = screenfull.isFullscreen;
      setIsFullscreen(active);
      document.body.classList.toggle("player-fullscreen", active);
    };

    screenfull.on("change", onChange);
    return () => {
      screenfull.off("change", onChange);
      document.body.classList.remove("player-fullscreen");
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    if (screenfull.isEnabled) {
      await screenfull.toggle(container);
      return;
    }

    const webkitVideo = video as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
    };
    if (webkitVideo.webkitEnterFullscreen) {
      webkitVideo.webkitEnterFullscreen();
      setIsFullscreen(true);
      document.body.classList.add("player-fullscreen");
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const video = videoRef.current;
      if (!video || loadError) return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          event.preventDefault();
          skip(-5);
          break;
        case "ArrowRight":
          event.preventDefault();
          skip(5);
          break;
        case "ArrowUp":
          event.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          setVolume(video.volume);
          video.muted = false;
          setMuted(false);
          persistAudioPreference(true);
          setShowTapForSound(false);
          break;
        case "ArrowDown":
          event.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          setVolume(video.volume);
          break;
        case "m":
        case "M": {
          const nextMuted = !video.muted;
          video.muted = nextMuted;
          setMuted(nextMuted);
          if (nextMuted) {
            persistAudioPreference(false);
          } else {
            persistAudioPreference(true);
            setShowTapForSound(false);
          }
          break;
        }
        case "f":
        case "F":
          void toggleFullscreen();
          break;
        default:
          if (/^[0-9]$/.test(event.key)) {
            const pct = Number(event.key) / 10;
            if (video.duration) {
              video.currentTime = video.duration * pct;
            }
          }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loadError, skip, togglePlay, toggleFullscreen]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
    if (nextMuted) {
      persistAudioPreference(false);
    } else {
      persistAudioPreference(true);
      setShowTapForSound(false);
    }
  };

  const unmuteFromTap = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setMuted(false);
    persistAudioPreference(true);
    setShowTapForSound(false);
  };

  const handleSeek = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
    if (duration - value > AUToplay_THRESHOLD && !autoplayCanceled) {
      setCountdownVisible(false);
      setCountdownSeconds(AUToplay_THRESHOLD);
      countdownStartedRef.current = false;
    }
  };

  const handleTimeUpdate = (time: number, total: number) => {
    setCurrentTime(time);
    if (
      !playing ||
      autoplayCanceled ||
      !nextEpisode ||
      loadError ||
      showEndOfSeries
    ) {
      return;
    }

    const remaining = total - time;
    if (remaining > AUToplay_THRESHOLD) {
      if (countdownVisible) {
        setCountdownVisible(false);
        setCountdownSeconds(AUToplay_THRESHOLD);
        countdownStartedRef.current = false;
      }
      return;
    }

    if (remaining <= 0) return;

    const secs = Math.ceil(remaining);
    if (!countdownVisible) {
      setCountdownVisible(true);
      if (!countdownStartedRef.current) {
        countdownStartedRef.current = true;
        if (!nextEpisode.locked) {
          console.log("[autoplay] countdown_started", {
            episodeId,
            nextEpisodeId: nextEpisode.id,
          });
        }
      }
    }
    setCountdownSeconds(secs);
  };

  const handleEnded = () => {
    setPlaying(false);
    void saveProgress(duration, true);
    setCountdownVisible(false);

    if (nextEpisode && !autoplayCanceled && !navigatedRef.current && !nextEpisode.locked) {
      navigateToNext(false);
      return;
    }

    if (!nextEpisode) {
      setShowEndOfSeries(true);
      console.log("[autoplay] series_completed", { seriesSlug });
    }
  };

  const handleSurfaceTap = (clientX: number, width: number, left: number) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      const isLeft = clientX < left + width / 2;
      skip(isLeft ? -10 : 10);
      lastTapRef.current = 0;
      return;
    }

    lastTapRef.current = now;
    tapTimerRef.current = setTimeout(() => {
      setShowControls((visible) => {
        const next = !visible;
        if (next && playing) {
          hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
        }
        return next;
      });
    }, 280);
  };

  const onSurfaceClick = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    handleSurfaceTap(event.clientX, rect.width, rect.left);
  };

  const onSurfaceTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    const rect = event.currentTarget.getBoundingClientRect();
    handleSurfaceTap(touch.clientX, rect.width, rect.left);
  };

  const objectFitClass =
    fitToScreen && isLandscapeMobile ? "object-cover" : "object-contain";

  const iconClass = "h-6 w-6 fill-white md:h-5 md:w-5";

  return (
    <div
      ref={containerRef}
      className={`relative mx-auto w-full max-w-md overflow-hidden rounded-xl bg-black ${
        isFullscreen
          ? "fixed inset-0 z-[100] max-h-none max-w-none rounded-none"
          : "max-h-[calc(100dvh-5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] aspect-[9/16]"
      }`}
      onMouseMove={() => bumpControls()}
    >
      {loadError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black p-6 text-center">
          <p className="text-base text-gray-300">
            Connection issue. Tap to retry.
          </p>
          <button type="button" onClick={retryLoad} className="rw-btn-primary min-h-11 px-6 text-sm">
            Try again
          </button>
        </div>
      ) : (
        <>
          <div
            className="absolute inset-0 z-10"
            onClick={onSurfaceClick}
            onTouchEnd={onSurfaceTouchEnd}
            aria-hidden
          />

          <video
            ref={videoRef}
            className={`relative z-0 h-full w-full ${objectFitClass}`}
            poster={poster ?? undefined}
            playsInline
            preload="metadata"
            onTimeUpdate={(e) =>
              handleTimeUpdate(e.currentTarget.currentTime, e.currentTarget.duration)
            }
            onLoadedMetadata={(e) => {
              setDuration(e.currentTarget.duration);
              setIsInitialLoad(false);
              if (autoPlay) {
                void attemptAutoPlay();
              }
            }}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => {
              setIsBuffering(false);
              setIsInitialLoad(false);
              const video = videoRef.current;
              if (video && !video.muted) {
                persistAudioPreference(true);
              }
            }}
            onCanPlay={() => setIsBuffering(false)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={handleEnded}
          >
            {subtitleUrl && (
              <track
                kind="subtitles"
                src={subtitleUrl}
                srcLang="en"
                label="English"
                default={subtitlesOn}
              />
            )}
          </video>

          {(isInitialLoad || isBuffering) && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40">
              <LoadingSpinner className="h-10 w-10" label="Loading video" />
            </div>
          )}

          {showTapForSound && (
            <button
              type="button"
              onClick={unmuteFromTap}
              className="pointer-events-auto absolute left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-40 -translate-x-1/2 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur-md"
            >
              Tap for sound
            </button>
          )}

          {!playing && !isInitialLoad && !showEndOfSeries && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 z-20 flex items-center justify-center"
              aria-label="Play episode"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 ring-2 ring-white/30">
                <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8 fill-white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )}

          {countdownVisible && nextEpisode && !showEndOfSeries && (
            <AutoplayOverlay
              nextEpisode={nextEpisode}
              countdownSeconds={countdownSeconds}
              isAuthenticated={isAuthenticated}
              onCancel={handleCancelAutoplay}
            />
          )}

          {showEndOfSeries && (
            <EndOfSeriesOverlay
              seriesTitle={seriesTitle}
              seriesSlug={seriesSlug}
              otherSeries={otherSeries}
            />
          )}

          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-16 transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="pointer-events-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="rw-player-progress mb-3 w-full"
                aria-label="Seek"
              />

              <div className="flex items-center justify-between gap-1 text-white">
                <div className="flex items-center gap-0.5">
                  <ControlButton label={playing ? "Pause" : "Play"} onClick={togglePlay}>
                    {playing ? (
                      <svg viewBox="0 0 24 24" className={iconClass}>
                        <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className={iconClass}>
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </ControlButton>

                  <ControlButton label="Skip back 10 seconds" onClick={() => skip(-10)}>
                    <svg viewBox="0 0 24 24" className={iconClass}>
                      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                    </svg>
                  </ControlButton>

                  <ControlButton label="Skip forward 10 seconds" onClick={() => skip(10)}>
                    <svg viewBox="0 0 24 24" className={iconClass}>
                      <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
                    </svg>
                  </ControlButton>

                  <ControlButton
                    label={muted ? "Unmute" : "Mute"}
                    onClick={toggleMute}
                  >
                    {muted ? (
                      <svg viewBox="0 0 24 24" className={iconClass}>
                        <path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className={iconClass}>
                        <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2A4.5 4.5 0 0014 7.97v8.06c1.48-.73 2.5-2.25 2.5-4.03z" />
                      </svg>
                    )}
                  </ControlButton>

                  <span className="hidden min-w-[4.5rem] text-sm tabular-nums text-gray-200 sm:inline">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-0.5">
                  <span className="text-sm tabular-nums text-gray-200 sm:hidden">
                    {formatTime(currentTime)}
                  </span>

                  <div className="relative hidden items-center gap-2 md:flex">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={muted ? 0 : volume}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const video = videoRef.current;
                        if (!video) return;
                        video.volume = v;
                        video.muted = v === 0;
                        setVolume(v);
                        setMuted(v === 0);
                        if (v > 0) {
                          persistAudioPreference(true);
                          setShowTapForSound(false);
                        }
                      }}
                      className="rw-player-progress w-20"
                      aria-label="Volume"
                    />
                  </div>

                  {isLandscapeMobile && (
                    <ControlButton
                      label={fitToScreen ? "Fit video" : "Fill screen"}
                      onClick={() => setFitToScreen((v) => !v)}
                      active={fitToScreen}
                    >
                      <span className="text-xs font-bold">{fitToScreen ? "FIT" : "FILL"}</span>
                    </ControlButton>
                  )}

                  <div className="relative">
                    <ControlButton
                      label="Playback speed"
                      onClick={() => setShowSpeedMenu((v) => !v)}
                      active={playbackRate !== 1}
                    >
                      <span className="text-xs font-bold">{playbackRate}x</span>
                    </ControlButton>
                    {showSpeedMenu && (
                      <div className="absolute bottom-12 right-0 min-w-[5rem] rounded-lg border border-white/10 bg-black/95 py-1 shadow-lg">
                        {SPEEDS.map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            onClick={() => {
                              setPlaybackRate(speed);
                              setShowSpeedMenu(false);
                            }}
                            className={`block w-full px-4 py-2 text-left text-sm hover:bg-white/10 ${
                              playbackRate === speed ? "text-obsidian-red" : "text-white"
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {subtitleUrl && (
                    <ControlButton
                      label={subtitlesOn ? "Turn off subtitles" : "Turn on subtitles"}
                      onClick={() => {
                        setSubtitlesOn((v) => !v);
                        const video = videoRef.current;
                        if (!video) return;
                        for (let i = 0; i < video.textTracks.length; i++) {
                          video.textTracks[i].mode = subtitlesOn ? "hidden" : "showing";
                        }
                      }}
                      active={subtitlesOn}
                    >
                      <span className="text-xs font-bold">CC</span>
                    </ControlButton>
                  )}

                  <ControlButton label="Fullscreen" onClick={() => void toggleFullscreen()}>
                    <svg viewBox="0 0 24 24" className={iconClass}>
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                    </svg>
                  </ControlButton>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
