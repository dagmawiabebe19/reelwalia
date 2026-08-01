"use client";

/** In-memory session flag — resets on full page reload, not localStorage. */
let feedSwipeUpLearned = false;

export function hasLearnedFeedSwipeUp(): boolean {
  return feedSwipeUpLearned;
}

export function markFeedSwipeUpLearned(): void {
  feedSwipeUpLearned = true;
}

type FeedSwipeHintProps = {
  visible: boolean;
  /** Next episode is locked — still cue that more content exists. */
  lockedNext?: boolean;
};

/**
 * Subtle “swipe up” cue for the mobile vertical feed.
 * pointer-events-none so it never blocks controls.
 * Sits just above the bottom-anchored control bar.
 */
export function FeedSwipeHint({
  visible,
  lockedNext = false,
}: FeedSwipeHintProps) {
  return (
    <div
      data-swipe-up-hint
      className={`pointer-events-none absolute inset-x-0 bottom-[5.25rem] z-40 flex justify-center transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <div className="rw-swipe-up-hint flex flex-col items-center gap-1 rounded-full border border-white/10 bg-black/55 px-3.5 py-2 backdrop-blur-sm">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 fill-obsidian-red"
          aria-hidden
        >
          <path d="M12 4l-7 7h4.5v7h5v-7H19l-7-7z" />
        </svg>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90">
          {lockedNext ? "Swipe up for more" : "Swipe up ↑"}
        </p>
      </div>
    </div>
  );
}
