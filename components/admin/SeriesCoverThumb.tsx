"use client";

import { useState } from "react";
import { getComingSoonPosterClass } from "@/lib/coming-soon-poster";

const THUMB_CLASS =
  "h-14 w-10 shrink-0 overflow-hidden rounded-md border border-white/[0.08]";

function GradientPlaceholder({
  title,
  genres,
}: {
  title: string;
  genres: string[];
}) {
  return (
    <div
      className={`${THUMB_CLASS} ${getComingSoonPosterClass(genres)}`}
      title={title}
      aria-hidden
    />
  );
}

export function SeriesCoverThumb({
  posterUrl,
  title,
  genres,
}: {
  posterUrl: string | null;
  title: string;
  genres: string[];
}) {
  const [loadFailed, setLoadFailed] = useState(false);
  const showPoster = Boolean(posterUrl) && !loadFailed;

  if (!showPoster) {
    return <GradientPlaceholder title={title} genres={genres} />;
  }

  return (
    <div className={`relative ${THUMB_CLASS} bg-zinc-900`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterUrl!}
        alt={title}
        width={40}
        height={56}
        loading="lazy"
        decoding="async"
        className="block h-full w-full object-cover"
        onError={() => setLoadFailed(true)}
      />
    </div>
  );
}
