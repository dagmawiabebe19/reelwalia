import type { Series } from "@/lib/types/database";
import {
  formatGenreLabel,
  getComingSoonPosterClass,
} from "@/lib/coming-soon-poster";

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
          <div
            key={item.id}
            className="group w-[7.5rem] shrink-0 sm:w-36 lg:w-40"
            aria-label={`${item.title} — coming soon`}
          >
            <div className="rw-card relative aspect-[9/16] overflow-hidden rounded-lg border border-white/10">
              {item.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.poster_url}
                  alt=""
                  className="h-full w-full object-cover opacity-90"
                />
              ) : (
                <div
                  className={`flex h-full flex-col justify-between p-3 ${getComingSoonPosterClass(item.genre)}`}
                >
                  <span className="text-[10px] font-medium uppercase tracking-widest text-white/40">
                    Walia Studios
                  </span>
                  <p className="font-display text-sm uppercase leading-tight tracking-wide text-white">
                    {item.title}
                  </p>
                </div>
              )}
              <span className="absolute right-2 top-2 rounded-full bg-obsidian-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Coming Soon
              </span>
            </div>
            <p className="mt-2.5 font-display text-sm uppercase leading-tight tracking-wide text-white">
              {item.title}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-obsidian-red/90">
              {formatGenreLabel(item.genre)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
