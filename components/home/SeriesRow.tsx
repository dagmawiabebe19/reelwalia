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
    <section className="space-y-4 sm:space-y-5">
      <h2 className="rw-section-title">{title}</h2>
      <div className="rw-scroll-x">
        {series.map((item) => (
          <Link
            key={item.id}
            href={`/series/${item.slug}`}
            className="group w-[8.75rem] shrink-0 sm:w-48 lg:w-52"
          >
            <div className="rw-card rw-card-hover rw-card-media aspect-[2/3]">
              {item.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.poster_url}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col justify-end bg-gradient-to-b from-zinc-900 to-black p-3">
                  <p className="font-display text-sm uppercase leading-tight tracking-wide">
                    {item.title}
                  </p>
                </div>
              )}
            </div>
            <p className="rw-card-title mt-3">{item.title}</p>
            {item.tagline && <p className="rw-card-subtitle mt-1">{item.tagline}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
