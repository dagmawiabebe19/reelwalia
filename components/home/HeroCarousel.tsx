"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { WatchEpisodeLink } from "@/components/watch/WatchEpisodeLink";
import type { Series } from "@/lib/types/database";

type HeroItem = Pick<
  Series,
  "id" | "title" | "slug" | "tagline" | "banner_url" | "poster_url" | "genre"
> & {
  firstEpisodeId: string | null;
};

interface HeroCarouselProps {
  items: HeroItem[];
}

export function HeroCarousel({ items }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const count = items.length;

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(goNext, 6000);
    return () => clearInterval(timer);
  }, [count, goNext]);

  if (count === 0) return null;

  const active = items[activeIndex];

  return (
    <section className="relative overflow-hidden rounded-xl border border-white/[0.08]">
      <div className="relative aspect-[21/9] min-h-[280px] w-full bg-gradient-to-br from-zinc-900 to-black sm:min-h-[360px]">
        {active.banner_url || active.poster_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={active.banner_url ?? active.poster_url ?? ""}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

        <div className="relative flex h-full flex-col justify-end p-6 sm:p-10">
          {active.genre?.length > 0 && (
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-obsidian-red">
              {active.genre.slice(0, 2).join(" · ")}
            </p>
          )}
          <h1 className="font-display text-3xl uppercase leading-tight sm:text-5xl">
            {active.title}
          </h1>
          {active.tagline && (
            <p className="mt-2 max-w-lg text-sm text-gray-400 sm:text-base">{active.tagline}</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {active.firstEpisodeId ? (
              <WatchEpisodeLink
                episodeId={active.firstEpisodeId}
                className="rw-btn-primary inline-flex min-h-11 items-center justify-center"
              >
                Watch Now
              </WatchEpisodeLink>
            ) : (
              <Button href={`/series/${active.slug}`} className="min-h-11">
                Watch Now
              </Button>
            )}
            <Button href={`/series/${active.slug}`} variant="secondary" className="min-h-11">
              More Info
            </Button>
          </div>
        </div>
      </div>

      {count > 1 && (
        <div className="absolute bottom-4 right-4 flex gap-2 sm:bottom-6 sm:right-6">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show ${item.title}`}
              onClick={() => setActiveIndex(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === activeIndex
                  ? "w-8 bg-obsidian-red"
                  : "w-4 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
