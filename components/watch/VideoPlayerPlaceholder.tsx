"use client";

interface VideoPlayerPlaceholderProps {
  episodeTitle: string;
  seriesTitle: string;
}

export function VideoPlayerPlaceholder({
  episodeTitle,
  seriesTitle,
}: VideoPlayerPlaceholderProps) {
  return (
    <div className="relative mx-auto aspect-[9/16] max-h-[85vh] w-full max-w-md overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-950">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.08] bg-black">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-8 w-8 text-obsidian-red"
            aria-hidden
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-400">{seriesTitle}</p>
          <p className="mt-1 font-display text-lg uppercase">{episodeTitle}</p>
        </div>
        <p className="text-sm text-gray-400">
          Video player coming soon — Phase 1
        </p>
      </div>
    </div>
  );
}
