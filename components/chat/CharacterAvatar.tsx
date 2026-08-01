"use client";

import { useState } from "react";

/** Circular character avatar with graceful fallback when URL is missing/broken. */
export function CharacterAvatar({
  name,
  avatarUrl,
  sizeClass = "h-14 w-14",
  textClass = "text-lg",
  className = "",
  online = false,
}: {
  name: string;
  avatarUrl: string | null | undefined;
  sizeClass?: string;
  textClass?: string;
  className?: string;
  online?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const initial = (name?.trim().charAt(0) || "?").toUpperCase();
  const trimmedUrl = avatarUrl?.trim() || "";
  const showImage =
    !!trimmedUrl && !broken && !trimmedUrl.includes("<PLACEHOLDER");

  return (
    <div className={`relative shrink-0 ${sizeClass} ${className}`}>
      <div
        className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-obsidian-red/40 bg-gradient-to-br from-obsidian-red/30 via-zinc-900 to-black shadow-[0_0_24px_rgba(224,60,47,0.25)]`}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trimmedUrl}
            alt={name}
            className="h-full w-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <span className={`font-display font-bold text-obsidian-red ${textClass}`}>
            {initial}
          </span>
        )}
      </div>
      {online && (
        <span
          className="absolute bottom-0.5 right-0.5 flex h-3.5 w-3.5"
          aria-label="Online"
        >
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70"
            aria-hidden
          />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-black bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
        </span>
      )}
    </div>
  );
}
