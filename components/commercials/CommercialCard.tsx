"use client";

import { CommercialInlineVideo } from "@/components/commercials/CommercialInlineVideo";
import { PlayIcon } from "@/components/commercials/CommercialIcons";
import { ASPECT_CSS, commercialClientLabel, type Commercial } from "@/lib/commercials/constants";

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Autoplays muted while on screen; the video only downloads once the card is near the viewport. */
export function CommercialCard({
  commercial,
  onOpen,
}: {
  commercial: Commercial;
  onOpen: (c: Commercial) => void;
}) {
  const vertical = commercial.aspect_ratio === "9:16";
  const duration = formatDuration(commercial.duration_seconds);

  return (
    <CommercialInlineVideo
      commercial={commercial}
      className="commercial-card group mb-4 block w-full break-inside-avoid rounded-2xl border border-white/[0.07] bg-zinc-900 shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition duration-300 hover:-translate-y-0.5 hover:border-commercial-red/50"
      style={{ aspectRatio: ASPECT_CSS[commercial.aspect_ratio] }}
      overlay={({ playing }) => (
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

          <button
            type="button"
            onClick={() => onOpen(commercial)}
            className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-commercial-red"
            aria-label={`Play ${commercial.title} — ${commercialClientLabel(commercial)}`}
          />

          {!playing && (
            <span
              className={`pointer-events-none absolute z-10 flex items-center justify-center rounded-full bg-black/45 text-white opacity-90 ring-1 ring-white/25 backdrop-blur transition duration-300 group-hover:bg-commercial-red ${
                vertical
                  ? "left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 group-hover:scale-110"
                  : "left-2.5 top-2.5 h-8 w-8"
              }`}
            >
              <PlayIcon className={vertical ? "ml-0.5 h-5 w-5" : "ml-0.5 h-3.5 w-3.5"} />
            </span>
          )}

          {duration && (
            <span className="pointer-events-none absolute right-2.5 top-2.5 z-10 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white/90">
              {duration}
            </span>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 pr-14 sm:p-4 sm:pr-14">
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
        </>
      )}
    />
  );
}
