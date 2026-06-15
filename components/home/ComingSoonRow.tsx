import Link from "next/link";
import type { Series } from "@/lib/types/database";
import { ComingSoonBadge } from "@/components/series/ComingSoonBadge";
import { ComingSoonPosterArt } from "@/components/series/ComingSoonPosterArt";
import { formatGenreLabel } from "@/lib/coming-soon-poster";

export type ComingSoonSeriesCard = Pick<
  Series,
  "id" | "title" | "slug" | "description" | "poster_url" | "genre"
>;

interface ComingSoonRowProps {
  series: ComingSoonSeriesCard[];
}

export function ComingSoonRow({ series }: ComingSoonRowProps) {
  if (series.length === 0) return null;

  return (
    <section className="space-y-4 sm:space-y-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="rw-section-title">Coming Soon</h2>
        <p className="text-xs uppercase tracking-wide text-gray-500">
          In development
        </p>
      </div>
      <div className="rw-scroll-x">
        {series.map((item) => (
          <Link
            key={item.id}
            href={`/series/${item.slug}`}
            className="group w-[7.5rem] shrink-0 sm:w-36 lg:w-40"
            aria-label={`${item.title} — coming soon`}
          >
            <div className="rw-card relative aspect-[9/16] overflow-hidden rounded-lg border border-white/10">
              {item.poster_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.poster_url}
                    alt=""
                    className="h-full w-full object-cover opacity-90"
                  />
                  <ComingSoonBadge className="absolute bottom-2 left-2 z-10" />
                </>
              ) : (
                <ComingSoonPosterArt
                  title={item.title}
                  genres={item.genre}
                  badgeClassName="absolute bottom-2 left-2 z-10"
                />
              )}
            </div>
            <p className="mt-2.5 font-display text-sm uppercase leading-tight tracking-wide text-white group-hover:text-obsidian-red">
              {item.title}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-obsidian-red/90">
              {formatGenreLabel(item.genre)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
