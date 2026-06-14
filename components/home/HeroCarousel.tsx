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
    <section className="relative overflow-hidden rounded-xl border border-white/[0.08] shadow-hero-vignette">
      <div className="relative aspect-[21/9] min-h-[280px] w-full bg-gradient-to-br from-zinc-900 to-black sm:min-h-[360px]">
        {active.banner_url || active.poster_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={active.banner_url ?? active.poster_url ?? ""}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity duration-700"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(224,60,47,0.12),transparent_60%)]" />

        <div className="relative flex h-full flex-col justify-end p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-10">
          {active.genre?.length > 0 && (
            <p className="rw-genre-label mb-2.5">
              {active.genre.slice(0, 2).join(" · ")}
            </p>
          )}
          <h1 className="rw-hero-title max-w-[95%] sm:max-w-2xl">{active.title}</h1>
          {active.tagline && (
            <p className="rw-hero-tagline">{active.tagline}</p>
          )}
          <div className="mt-7 flex flex-wrap gap-3 sm:mt-8 sm:gap-4">
            {active.firstEpisodeId ? (
              <WatchEpisodeLink
                episodeId={active.firstEpisodeId}
                className="rw-btn-primary min-w-[140px] flex-1 sm:flex-none"
              >
                Watch Now
              </WatchEpisodeLink>
            ) : (
              <Button href={`/series/${active.slug}`} className="min-w-[140px] flex-1 sm:flex-none">
                Watch Now
              </Button>
            )}
            <Button
              href={`/series/${active.slug}`}
              variant="secondary"
              className="min-w-[120px] flex-1 sm:flex-none"
            >
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
              className={`h-1.5 rounded-full transition-all duration-300 ${
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
