"use client";

import { PaywallModal } from "@/components/PaywallModal";
import { useState } from "react";

export interface AutoplayNextEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  locked: boolean;
}

interface AutoplayOverlayProps {
  nextEpisode: AutoplayNextEpisode;
  countdownSeconds: number;
  isAuthenticated?: boolean;
  onCancel: () => void;
  onWatchNow: () => void;
}

export function AutoplayOverlay({
  nextEpisode,
  countdownSeconds,
  isAuthenticated = false,
  onCancel,
  onWatchNow,
}: AutoplayOverlayProps) {
  const [paywallOpen, setPaywallOpen] = useState(false);

  if (nextEpisode.locked) {
    return (
      <>
        <div className="pointer-events-auto absolute inset-x-3 bottom-20 z-40 flex justify-center sm:inset-x-auto sm:bottom-6 sm:right-4 sm:justify-end">
          <div className="w-full max-w-[320px] rounded-xl bg-black/80 p-4 backdrop-blur-md">
            <p className="font-display text-xs uppercase tracking-wide text-obsidian-red">
              Up Next
            </p>
            <p className="mt-2 text-sm font-bold text-white">
              Subscribe to continue
            </p>
            <p className="mt-1 text-sm text-white/70">
              Episode {nextEpisode.episodeNumber} — {nextEpisode.title}
            </p>
            <button
              type="button"
              onClick={() => setPaywallOpen(true)}
              className="rw-btn-primary mt-4 w-full text-sm"
            >
              Subscribe
            </button>
          </div>
        </div>
        <PaywallModal
          open={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          episodeId={nextEpisode.id}
          isAuthenticated={isAuthenticated}
        />
      </>
    );
  }

  return (
    <div className="pointer-events-auto absolute inset-x-3 bottom-20 z-40 flex justify-center sm:inset-x-auto sm:bottom-6 sm:right-4 sm:justify-end">
      <div className="w-full max-w-[320px] rounded-xl bg-black/80 p-4 backdrop-blur-md">
        <p className="font-display text-xs uppercase tracking-wide text-obsidian-red">
          Up Next
        </p>

        {nextEpisode.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={nextEpisode.thumbnailUrl}
            alt=""
            className="mt-3 h-20 w-auto rounded object-cover"
          />
        ) : (
          <div className="mt-3 flex h-20 w-14 items-center justify-center rounded bg-zinc-800 text-lg font-semibold text-gray-400">
            {nextEpisode.episodeNumber}
          </div>
        )}

        <p className="mt-3 text-sm font-bold text-white">
          Episode {nextEpisode.episodeNumber} — {nextEpisode.title}
        </p>

        {nextEpisode.description && (
          <p className="mt-1 truncate text-sm text-white/70">
            {nextEpisode.description}
          </p>
        )}

        <p className="mt-3 text-xs text-white/70">
          Playing in {countdownSeconds}s
        </p>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 text-sm text-white hover:text-white/80"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onWatchNow}
            className="rw-btn-primary min-h-11 flex-1 text-sm"
          >
            Watch Now
          </button>
        </div>
      </div>
    </div>
  );
}
