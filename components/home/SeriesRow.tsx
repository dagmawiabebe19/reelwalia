import Link from "next/link";
import type { Series } from "@/lib/types/database";

type SeriesCard = Pick<
  Series,
  "id" | "title" | "slug" | "tagline" | "poster_url" | "genre"
>;

interface SeriesRowProps {
  title: string;
  series: SeriesCard[];
}

export function SeriesRow({ title, series }: SeriesRowProps) {
  if (series.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl uppercase tracking-wide sm:text-2xl">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {series.map((item) => (
          <Link
            key={item.id}
            href={`/series/${item.slug}`}
            className="group w-36 shrink-0 sm:w-44"
          >
            <div className="rw-card aspect-[2/3] overflow-hidden transition group-hover:border-white/20">
              {item.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.poster_url}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col justify-end bg-gradient-to-b from-zinc-900 to-black p-3">
                  <p className="font-display text-sm uppercase leading-tight">{item.title}</p>
                </div>
              )}
            </div>
            <p className="mt-2 truncate text-sm font-medium">{item.title}</p>
            {item.tagline && (
              <p className="truncate text-xs text-gray-400">{item.tagline}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
