"use client";

import Link from "next/link";
import { SeriesRow } from "@/components/home/SeriesRow";
import type { Series } from "@/lib/types/database";

type OtherSeries = Pick<
  Series,
  "id" | "title" | "slug" | "tagline" | "poster_url" | "genre"
>;

interface EndOfSeriesOverlayProps {
  seriesTitle: string;
  seriesSlug: string;
  otherSeries: OtherSeries[];
}

export function EndOfSeriesOverlay({
  seriesTitle,
  seriesSlug,
  otherSeries,
}: EndOfSeriesOverlayProps) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center p-4">
      <div className="max-h-[85%] w-full max-w-md overflow-y-auto rounded-xl bg-black/80 p-4 backdrop-blur-md sm:p-5">
        <p className="font-display text-xs uppercase tracking-wide text-obsidian-red">
          You&apos;re All Caught Up
        </p>
        <h2 className="mt-2 font-display text-xl uppercase text-white sm:text-2xl">
          {seriesTitle}
        </h2>

        {otherSeries.length > 0 && (
          <div className="mt-5">
            <SeriesRow title="More from Walia Studios" series={otherSeries} />
          </div>
        )}

        <Link
          href={`/series/${seriesSlug}`}
          className="rw-btn-primary mt-5 inline-flex min-h-11 w-full items-center justify-center text-sm"
        >
          Back to Series
        </Link>
      </div>
    </div>
  );
}
