"use client";

interface PaywallPlaceholderProps {
  seriesTitle: string;
  episodeNumber: number;
}

export function PaywallPlaceholder({
  seriesTitle,
  episodeNumber,
}: PaywallPlaceholderProps) {
  return (
    <div className="relative mx-auto flex aspect-[9/16] w-full max-w-md flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-950 p-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-black">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-obsidian-red" fill="currentColor">
          <path d="M18 8h-1V6a5 5 0 00-10 0v2H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2zm-6 9a2 2 0 110-4 2 2 0 010 4zm3.1-9H8.9V6a3.1 3.1 0 016.2 0v2z" />
        </svg>
      </div>
      <p className="text-xs uppercase tracking-widest text-gray-400">{seriesTitle}</p>
      <h2 className="mt-1 font-display text-xl uppercase">Episode {episodeNumber}</h2>
      <p className="mt-3 text-sm text-gray-400">
        This episode is premium. Subscribe to unlock the full series.
      </p>
      <button
        type="button"
        disabled
        className="rw-btn-primary mt-6 cursor-not-allowed opacity-60"
      >
        Subscribe to unlock
      </button>
      <p className="mt-2 text-xs text-gray-500">Stripe billing — Phase 2</p>
    </div>
  );
}
