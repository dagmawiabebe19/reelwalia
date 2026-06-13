"use client";

import Hls from "hls.js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  src: string;
  poster?: string | null;
  subtitleUrl?: string | null;
  episodeId: string;
  seriesId: string;
  nextEpisodeId?: string | null;
  initialProgress?: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideoPlayer({
  src,
  poster,
  subtitleUrl,
  episodeId,
  seriesId,
  nextEpisodeId,
  initialProgress = 0,
}: VideoPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [subtitlesOn, setSubtitlesOn] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        // Non-blocking — Phase 3 polishes retry logic
      }
    },
    [episodeId, seriesId]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const canNativeHls =
      video.canPlayType("application/vnd.apple.mpegurl") !== "";

    if (canNativeHls) {
      video.src = src;
    } else if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) console.error("HLS fatal error:", data);
      });
    } else {
      video.src = src;
    }

    return () => {
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryAutoplay = async () => {
      try {
        await video.play();
        setPlaying(true);
      } catch {
        video.muted = true;
        setMuted(true);
        try {
          await video.play();
          setPlaying(true);
        } catch {
          setPlaying(false);
        }
      }
    };

    void tryAutoplay();
  }, [src]);

  useEffect(() => {
    progressIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused) return;
      void saveProgress(video.currentTime, false);
    }, 5000);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [saveProgress]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const t = Number(e.target.value);
    video.currentTime = t;
    setCurrentTime(t);
  };

  const handleEnded = () => {
    setPlaying(false);
    void saveProgress(duration, true);
    if (nextEpisodeId) {
      router.push(`/watch/${nextEpisodeId}`);
    }
  };

  const bumpControls = () => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto aspect-[9/16] w-full max-w-md overflow-hidden rounded-xl bg-black"
      onMouseMove={bumpControls}
      onTouchStart={bumpControls}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        poster={poster ?? undefined}
        playsInline
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={handleEnded}
        onClick={togglePlay}
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

      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 transition-opacity ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="mb-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-obsidian-red"
          aria-label="Seek"
        />

        <div className="flex items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="rounded p-1.5 hover:bg-white/10"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="rounded p-1.5 hover:bg-white/10"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2A4.5 4.5 0 0014 7.97v8.06c1.48-.73 2.5-2.25 2.5-4.03z" />
                </svg>
              )}
            </button>

            <span className="text-xs tabular-nums text-gray-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {subtitleUrl && (
              <button
                type="button"
                onClick={() => {
                  setSubtitlesOn((v) => !v);
                  const video = videoRef.current;
                  if (!video) return;
                  for (let i = 0; i < video.textTracks.length; i++) {
                    video.textTracks[i].mode = subtitlesOn ? "hidden" : "showing";
                  }
                }}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  subtitlesOn ? "bg-obsidian-red text-white" : "bg-white/10"
                }`}
              >
                CC
              </button>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded p-1.5 hover:bg-white/10"
              aria-label="Fullscreen"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
