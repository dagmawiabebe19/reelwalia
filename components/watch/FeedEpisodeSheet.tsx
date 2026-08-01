"use client";

export type FeedNavEpisode = {
  id: string;
  episodeNumber: number;
  title: string;
  locked: boolean;
};

type FeedEpisodeSheetProps = {
  open: boolean;
  episodes: FeedNavEpisode[];
  currentEpisodeId: string;
  onClose: () => void;
  onSelect: (index: number) => void;
};

/**
 * Bottom sheet listing series episodes for mid-playback jumps.
 * Locked rows stay visible with a lock affordance — selection routes to paywall.
 */
export function FeedEpisodeSheet({
  open,
  episodes,
  currentEpisodeId,
  onClose,
  onSelect,
}: FeedEpisodeSheetProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/65"
        aria-label="Close episodes"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Episodes"
        className="relative max-h-[70%] overflow-hidden rounded-t-2xl border border-white/10 bg-zinc-950 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="font-display text-sm uppercase tracking-wide text-white">
            Episodes
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 min-w-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <ul className="max-h-[min(24rem,55dvh)] overflow-y-auto overscroll-contain px-2 py-2">
          {episodes.map((ep, index) => {
            const active = ep.id === currentEpisodeId;
            return (
              <li key={ep.id}>
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                    active
                      ? "bg-obsidian-red/20 text-white"
                      : "text-white/90 hover:bg-white/5"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold tabular-nums ${
                      active
                        ? "bg-obsidian-red text-white"
                        : "bg-white/10 text-white/80"
                    }`}
                  >
                    {ep.locked ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                        <path d="M18 8h-1V6a5 5 0 00-10 0v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zM9 6a3 3 0 016 0v2H9V6zm3 11a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    ) : (
                      ep.episodeNumber
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      Episode {ep.episodeNumber}
                      {ep.title && ep.title !== `Episode ${ep.episodeNumber}`
                        ? ` · ${ep.title}`
                        : ""}
                    </span>
                    {ep.locked ? (
                      <span className="block text-xs text-white/50">
                        Unlock with Full Access
                      </span>
                    ) : active ? (
                      <span className="block text-xs text-obsidian-red">Now playing</span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
