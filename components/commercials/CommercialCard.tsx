"use client";

import { useEffect, useRef, useState } from "react";
import { PlayIcon } from "@/components/commercials/CommercialIcons";
import { commercialClientLabel, type Commercial } from "@/lib/commercials/constants";

export const ASPECT_CSS: Record<Commercial["aspect_ratio"], string> = {
  "9:16": "9 / 16",
  "16:9": "16 / 9",
  "1:1": "1 / 1",
};

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Thumbnail card. The preview <video> only mounts on desktop hover, so nothing downloads up front. */
export function CommercialCard({
  commercial,
  onOpen,
}: {
  commercial: Commercial;
  onOpen: (c: Commercial) => void;
}) {
  const [canHover, setCanHover] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const vertical = commercial.aspect_ratio === "9:16";
  const videoRef = useRef<HTMLVideoElement>(null);
  const duration = formatDuration(commercial.duration_seconds);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCanHover(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (previewing) void videoRef.current?.play().catch(() => {});
  }, [previewing]);

  return (
    <button
      type="button"
      onClick={() => onOpen(commercial)}
      onMouseEnter={() => canHover && setPreviewing(true)}
      onMouseLeave={() => setPreviewing(false)}
      onFocus={() => canHover && setPreviewing(true)}
      onBlur={() => setPreviewing(false)}
      className="commercial-card group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-900 text-left shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition duration-300 hover:-translate-y-0.5 hover:border-commercial-red/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-commercial-red"
      style={{ aspectRatio: ASPECT_CSS[commercial.aspect_ratio] }}
      aria-label={`Play ${commercial.title} — ${commercialClientLabel(commercial)}`}
    >
      {commercial.thumbnail_url && !thumbFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={commercial.thumbnail_url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setThumbFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(229,57,53,0.35),transparent_65%),linear-gradient(160deg,#1a0a0a,#0A0A0A)]" />
      )}

      {previewing && (
        <video
          ref={videoRef}
          src={commercial.video_url}
          muted
          loop
          playsInline
          preload="none"
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      <span
        className={`pointer-events-none absolute flex items-center justify-center rounded-full bg-black/45 text-white opacity-90 ring-1 ring-white/25 backdrop-blur transition duration-300 group-hover:bg-commercial-red group-hover:opacity-0 ${
          vertical
            ? "left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 group-hover:scale-110"
            : "left-2.5 top-2.5 h-8 w-8"
        }`}
      >
        <PlayIcon className={vertical ? "ml-0.5 h-5 w-5" : "ml-0.5 h-3.5 w-3.5"} />
      </span>

      {duration && (
        <span className="pointer-events-none absolute right-2.5 top-2.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white/90">
          {duration}
        </span>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 sm:p-4">
        {commercial.category && (
          <p className={`${vertical ? "" : "hidden sm:block"} text-[10px] font-semibold uppercase tracking-[0.2em] text-commercial-red`}>
            {commercial.category}
          </p>
        )}
        <p
          className={`mt-1 font-display uppercase leading-tight tracking-wide text-white ${
            vertical ? "line-clamp-2 text-base sm:text-lg" : "line-clamp-1 text-sm sm:text-base"
          }`}
        >
          {commercial.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-zinc-400">{commercialClientLabel(commercial)}</p>
      </div>
    </button>
  );
}
