"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowRightIcon, CloseIcon } from "@/components/commercials/CommercialIcons";
import { ASPECT_CSS, commercialClientLabel, type Commercial } from "@/lib/commercials/constants";

const VIDEO_SIZE: Record<Commercial["aspect_ratio"], string> = {
  "9:16": "h-[min(60dvh,calc(92vw*16/9))] lg:h-[86dvh]",
  "1:1": "w-[min(92vw,62dvh)] lg:w-[min(56vw,80dvh)]",
  "16:9": "w-[min(92vw,calc(60dvh*16/9))] lg:w-[min(64vw,calc(80dvh*16/9))]",
};

export function CommercialPlayerModal({
  commercial,
  onClose,
  onWantOne,
}: {
  commercial: Commercial;
  onClose: () => void;
  onWantOne: (c: Commercial) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wide = commercial.aspect_ratio === "16:9";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.play().catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      video.muted = true;
      void video.play().catch(() => undefined);
    });
  }, [commercial.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  return createPortal(
    <div
      className="commercial-modal fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/90 px-3 pb-6 pt-16 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={commercial.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20"
        aria-label="Close"
      >
        <CloseIcon className="h-5 w-5" />
      </button>

      <div
        className={`my-auto flex w-full max-w-6xl flex-col items-center gap-5 ${wide ? "" : "lg:flex-row lg:items-center lg:justify-center lg:gap-10"}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={`relative max-w-full overflow-hidden rounded-2xl bg-black shadow-[0_30px_90px_rgba(0,0,0,0.8)] ring-1 ring-white/10 ${VIDEO_SIZE[commercial.aspect_ratio]}`}
          style={{ aspectRatio: ASPECT_CSS[commercial.aspect_ratio] }}
        >
          <video
            ref={videoRef}
            key={commercial.id}
            src={commercial.video_url}
            poster={commercial.thumbnail_url ?? undefined}
            controls
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full bg-black object-contain"
          />
        </div>

        <div className={`w-full max-w-md text-center ${wide ? "" : "lg:text-left"}`}>
          {commercial.category && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-commercial-red">
              {commercial.category}
            </p>
          )}
          <h2 className="mt-2 font-display text-2xl uppercase leading-tight tracking-wide text-white sm:text-3xl">
            {commercial.title}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">{commercialClientLabel(commercial)}</p>
          {commercial.description && (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
              {commercial.description}
            </p>
          )}
          <button
            type="button"
            onClick={() => onWantOne(commercial)}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-commercial-red to-commercial-deep px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_10px_36px_rgba(229,57,53,0.35)] transition hover:from-commercial-deep hover:to-commercial-deep"
          >
            Want one like this?
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
