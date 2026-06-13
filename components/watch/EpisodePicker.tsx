"use client";

import Link from "next/link";
import { useState } from "react";

export interface EpisodePickerItem {
  id: string;
  episode_number: number;
  title: string;
  thumbnail_url: string | null;
  locked: boolean;
}

interface EpisodePickerProps {
  episodes: EpisodePickerItem[];
  currentEpisodeId: string;
  seriesSlug: string;
}

export function EpisodePicker({
  episodes,
  currentEpisodeId,
  seriesSlug,
}: EpisodePickerProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const grid = (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-3 lg:grid-cols-2">
      {episodes.map((ep) => (
        <Link
          key={ep.id}
          href={ep.locked ? "#" : `/watch/${ep.id}`}
          onClick={(e) => ep.locked && e.preventDefault()}
          className={`relative overflow-hidden rounded border text-center transition ${
            ep.id === currentEpisodeId
              ? "border-obsidian-red bg-obsidian-red/10"
              : "border-white/[0.08] hover:border-white/20"
          } ${ep.locked ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <div className="aspect-[2/3] bg-zinc-900">
            {ep.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ep.thumbnail_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-lg font-semibold text-gray-500">
                {ep.episode_number}
              </div>
            )}
          </div>
          <p className="truncate px-1 py-1 text-xs">{ep.episode_number}</p>
          {ep.locked && (
            <span className="absolute right-1 top-1 rounded bg-black/70 p-0.5">
              <svg viewBox="0 0 16 16" className="h-3 w-3 text-gray-300" fill="currentColor">
                <path d="M11 7V5a3 3 0 00-6 0v2H4a1 1 0 00-1 1v5a1 1 0 001 1h8a1 1 0 001-1V8a1 1 0 00-1-1h-1zm-2 0H7V5a1.5 1.5 0 013 0v2z" />
              </svg>
            </span>
          )}
        </Link>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-20 space-y-3">
          <Link
            href={`/series/${seriesSlug}`}
            className="text-sm text-gray-400 hover:text-obsidian-red"
          >
            &larr; Series page
          </Link>
          <h3 className="font-display text-sm uppercase">Episodes</h3>
          {grid}
        </div>
      </aside>

      {/* Mobile bottom drawer */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-black lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        >
          <span>Episodes ({episodes.length})</span>
          <span className="text-gray-400">{drawerOpen ? "Hide" : "Show"}</span>
        </button>
        {drawerOpen && (
          <div className="max-h-48 overflow-y-auto border-t border-white/[0.08] p-3">
            {grid}
          </div>
        )}
      </div>
    </>
  );
}
