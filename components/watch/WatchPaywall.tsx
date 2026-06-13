"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PaywallModal } from "@/components/PaywallModal";

interface WatchPaywallProps {
  episodeId: string;
  posterUrl: string | null;
  seriesTitle: string;
  episodeNumber: number;
  showPaywall: boolean;
  isAuthenticated: boolean;
}

function WatchPaywallInner({
  episodeId,
  posterUrl,
  seriesTitle,
  episodeNumber,
  showPaywall,
  isAuthenticated,
}: WatchPaywallProps) {
  const searchParams = useSearchParams();
  const subscribed = searchParams.get("subscribed") === "true";
  const [modalOpen, setModalOpen] = useState(showPaywall && !subscribed);

  useEffect(() => {
    if (subscribed) setModalOpen(false);
  }, [subscribed]);

  return (
    <>
      <div className="relative mx-auto aspect-[9/16] w-full max-w-md overflow-hidden rounded-xl border border-white/[0.08]">
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt=""
            className="h-full w-full scale-105 object-cover blur-xl brightness-50"
          />
        ) : (
          <div className="h-full w-full bg-zinc-950" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 p-6 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/60">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-obsidian-red" fill="currentColor">
              <path d="M18 8h-1V6a5 5 0 00-10 0v2H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2zm-6 9a2 2 0 110-4 2 2 0 010 4zm3.1-9H8.9V6a3.1 3.1 0 016.2 0v2z" />
            </svg>
          </div>
          <p className="text-xs uppercase tracking-widest text-gray-400">{seriesTitle}</p>
          <p className="mt-1 font-display text-lg uppercase">Episode {episodeNumber}</p>
          {subscribed && isAuthenticated && (
            <p className="mt-3 text-sm text-obsidian-red">Welcome! Refreshing access…</p>
          )}
        </div>
      </div>

      <PaywallModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        episodeId={episodeId}
        isAuthenticated={isAuthenticated}
      />
    </>
  );
}

export function WatchPaywall(props: WatchPaywallProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto aspect-[9/16] w-full max-w-md rounded-xl bg-zinc-950" />
      }
    >
      <WatchPaywallInner {...props} />
    </Suspense>
  );
}
