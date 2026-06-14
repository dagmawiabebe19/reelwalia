"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { markWatchNavigation, watchEpisodeHref } from "@/lib/watch-playback";

interface WatchEpisodeLinkProps extends Omit<ComponentProps<typeof Link>, "href"> {
  episodeId: string;
  children: ReactNode;
}

export function WatchEpisodeLink({
  episodeId,
  children,
  onPointerDown,
  ...props
}: WatchEpisodeLinkProps) {
  return (
    <Link
      href={watchEpisodeHref(episodeId)}
      onPointerDown={(event) => {
        markWatchNavigation();
        onPointerDown?.(event);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
