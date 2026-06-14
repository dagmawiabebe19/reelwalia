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

/** Soft left scrim — keeps text readable without hiding characters on the right. */
const HERO_SCRIM_LEFT =
  "linear-gradient(to right, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.32) 38%, rgba(0,0,0,0.08) 58%, transparent 78%)";

/** Soft bottom scrim — anchors title and CTAs only. */
const HERO_SCRIM_BOTTOM =
  "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.22) 32%, transparent 58%)";

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
  const imageSrc = active.banner_url ?? active.poster_url ?? "";

  return (
    <section className="relative overflow-hidden rounded-xl border border-white/[0.08] shadow-hero-vignette">
      {/* Taller on mobile so vertical poster art keeps faces in frame */}
      <div className="relative aspect-[4/3] min-h-[320px] w-full bg-zinc-950 sm:aspect-[2/1] sm:min-h-[340px] lg:aspect-[21/9] lg:min-h-[380px]">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[68%_12%] transition-opacity duration-700 sm:object-[60%_18%] lg:object-[55%_20%]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black" />
        )}

        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: HERO_SCRIM_LEFT }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: HERO_SCRIM_BOTTOM }}
          aria-hidden
        />

        <div className="relative z-10 flex h-full flex-col justify-end p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-8 sm:pb-10 lg:p-10">
          <div className="max-w-[92%] sm:max-w-lg lg:max-w-xl">
            {active.genre?.length > 0 && (
              <p className="rw-genre-label rw-hero-genre mb-2.5">
                {active.genre.slice(0, 2).join(" · ")}
              </p>
            )}
            <h1 className="rw-hero-title">{active.title}</h1>
            {active.tagline && (
              <p className="rw-hero-tagline">{active.tagline}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-3 sm:mt-7 sm:gap-4">
              {active.firstEpisodeId ? (
                <WatchEpisodeLink
                  episodeId={active.firstEpisodeId}
                  className="rw-btn-primary min-w-[140px] flex-1 sm:flex-none"
                >
                  Watch Now
                </WatchEpisodeLink>
              ) : (
                <Button
                  href={`/series/${active.slug}`}
                  className="min-w-[140px] flex-1 sm:flex-none"
                >
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
      </div>

      {count > 1 && (
        <div className="absolute bottom-4 right-4 z-10 flex gap-2 sm:bottom-6 sm:right-6">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show ${item.title}`}
              onClick={() => setActiveIndex(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? "w-8 bg-obsidian-red"
                  : "w-4 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
