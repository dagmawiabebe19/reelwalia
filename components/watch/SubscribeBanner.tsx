"use client";

import { useState } from "react";
import { PaywallModal } from "@/components/PaywallModal";
import { formatUsd, getPlanDisplay } from "@/lib/stripe/plans";
import { usePaywallOpen, useSyncPaywallOpen } from "@/components/watch/PaywallOpenContext";

interface SubscribeBannerProps {
  episodeId: string;
  seriesSlug: string;
  isAuthenticated: boolean;
  placement?: "viewport" | "player";
}

const weekPlan = getPlanDisplay("1week");
const fromPriceLabel = `From ${formatUsd(weekPlan.amount)}${weekPlan.priceSuffix}`;

export function SubscribeBanner({
  episodeId,
  seriesSlug,
  isAuthenticated,
  placement = "viewport",
}: SubscribeBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { isPaywallOpen } = usePaywallOpen();
  useSyncPaywallOpen(modalOpen);

  const openPaywall = () => setModalOpen(true);
  const attachToPlayer = placement === "player";
  const mobileBarClass = attachToPlayer
    ? "absolute inset-x-0 bottom-0 z-40 border-t border-white/15 bg-black/90 backdrop-blur-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 animate-subscribe-slide-up lg:hidden"
    : "fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-black/90 backdrop-blur-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 animate-subscribe-slide-up lg:hidden";
  const desktopPillClass = attachToPlayer
    ? "absolute bottom-3 right-3 z-40 hidden w-full max-w-[280px] animate-subscribe-fade-in rounded-2xl border border-white/15 bg-black/90 p-4 backdrop-blur-md lg:block"
    : "fixed bottom-4 right-4 z-40 hidden w-full max-w-[320px] animate-subscribe-fade-in rounded-2xl border border-white/15 bg-black/90 p-4 backdrop-blur-md lg:block";

  return (
    <>
      {!isPaywallOpen && (
        <>
          {/* Mobile: sticky bottom bar */}
          <div
            className={mobileBarClass}
            data-subscribe-banner={attachToPlayer ? "player" : undefined}
            role="region"
            aria-label="Subscribe to unlock all episodes"
          >
            <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-white/70">
                  UNLOCK ALL EPISODES
                </p>
                <p className="text-sm font-semibold text-white">{fromPriceLabel}</p>
              </div>
              <button
                type="button"
                onClick={openPaywall}
                aria-label="Get full access to all episodes"
                className="min-h-11 shrink-0 rounded-full bg-obsidian-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-obsidian-red-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-red focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Get Full Access
              </button>
            </div>
          </div>

          {/* Desktop: floating bottom-right pill */}
          <div
            className={desktopPillClass}
            data-subscribe-banner={attachToPlayer ? "player" : undefined}
            role="region"
            aria-label="Subscribe to unlock all episodes"
          >
            <p className="text-xs uppercase tracking-wide text-white/70">
              UNLOCK ALL EPISODES
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{fromPriceLabel}</p>
            <button
              type="button"
              onClick={openPaywall}
              aria-label="Get full access to all episodes"
              className="mt-3 min-h-11 w-full rounded-full bg-obsidian-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-obsidian-red-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-red focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Get Full Access
            </button>
          </div>
        </>
      )}

      <PaywallModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        episodeId={episodeId}
        seriesSlug={seriesSlug}
        trigger="persistent_cta"
        isAuthenticated={isAuthenticated}
      />
    </>
  );
}
