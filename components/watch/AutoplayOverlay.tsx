"use client";

import { PaywallModal } from "@/components/PaywallModal";
import type { PaywallTrigger } from "@/lib/analytics/funnel";
import { useSyncPaywallOpen } from "@/components/watch/PaywallOpenContext";
import { useEffect, useState } from "react";

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
  seriesSlug: string;
  countdownSeconds: number;
  isAuthenticated?: boolean;
  autoOpenPaywall?: boolean;
  onCancel: () => void;
}

const pillPosition =
  "pointer-events-auto absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 sm:right-4 sm:top-[max(1rem,env(safe-area-inset-top))]";

export function AutoplayOverlay({
  nextEpisode,
  seriesSlug,
  countdownSeconds,
  isAuthenticated = false,
  autoOpenPaywall = false,
  onCancel,
}: AutoplayOverlayProps) {
  const [paywallOpen, setPaywallOpen] = useState(autoOpenPaywall);
  const [paywallTrigger, setPaywallTrigger] = useState<PaywallTrigger>(
    autoOpenPaywall ? "end_of_free_trial" : "manual_subscribe_button"
  );

  useEffect(() => {
    if (autoOpenPaywall) {
      setPaywallOpen(true);
      setPaywallTrigger("end_of_free_trial");
    }
  }, [autoOpenPaywall]);

  useSyncPaywallOpen(paywallOpen);

  if (nextEpisode.locked) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            setPaywallTrigger("manual_subscribe_button");
            setPaywallOpen(true);
          }}
          className={`${pillPosition} flex max-w-[120px] items-center gap-1.5 rounded-full border border-white/15 bg-black/50 py-1.5 pl-3 pr-3 backdrop-blur-md`}
        >
          <svg
            viewBox="0 0 16 16"
            className="h-3 w-3 shrink-0 text-white/70"
            fill="currentColor"
            aria-hidden
          >
            <path d="M11 7V5a3 3 0 00-6 0v2H4a1 1 0 00-1 1v5a1 1 0 001 1h8a1 1 0 001-1V8a1 1 0 00-1-1h-1zm-2 0H7V5a1.5 1.5 0 013 0v2z" />
          </svg>
          <span className="text-xs font-medium text-white">Subscribe</span>
        </button>
        <PaywallModal
          open={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          episodeId={nextEpisode.id}
          seriesSlug={seriesSlug}
          trigger={paywallTrigger}
          isAuthenticated={isAuthenticated}
        />
      </>
    );
  }

  return (
    <div
      className={`${pillPosition} flex max-w-[120px] items-center gap-2 rounded-full border border-white/15 bg-black/50 py-1.5 pl-3 pr-2 backdrop-blur-md`}
    >
      <span className="shrink-0 text-xs text-white/70">Next in</span>
      <span className="shrink-0 text-sm font-bold tabular-nums text-white">
        {countdownSeconds}
      </span>
      <span className="h-3 w-px shrink-0 bg-white/20" aria-hidden />
      <button
        type="button"
        onClick={onCancel}
        aria-label="Skip autoplay"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:text-white active:text-white"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden>
          <path
            d="M5 5l10 10M15 5L5 15"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
