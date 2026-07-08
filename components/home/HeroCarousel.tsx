"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { WatchEpisodeLink } from "@/components/watch/WatchEpisodeLink";
import type { Series } from "@/lib/types/database";

type HeroItem = Pick<
  Series,
  "id" | "title" | "slug" | "tagline" | "description" | "banner_url" | "poster_url" | "genre"
> & {
  firstEpisodeId: string | null;
};

function heroSynopsis(item: HeroItem): string | null {
  const text = item.description?.trim() || item.tagline?.trim();
  return text || null;
}

interface HeroCarouselProps {
  items: HeroItem[];
}

/** Keep left scrim subtle so faces stay visible. */
const HERO_SCRIM_LEFT =
  "linear-gradient(to right, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0.12) 34%, rgba(0,0,0,0.03) 56%, transparent 74%)";

/** Mobile-only thin bottom scrim band for compact copy area. */
const HERO_SCRIM_BOTTOM_MOBILE =
  "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.62) 14%, rgba(0,0,0,0.22) 25%, transparent 35%)";

/** Desktop/tablet scrim unchanged. */
const HERO_SCRIM_BOTTOM_DESKTOP =
  "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.72) 18%, rgba(0,0,0,0.36) 32%, rgba(0,0,0,0.08) 45%, transparent 58%)";

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
  const synopsis = heroSynopsis(active);

  return (
    <section className="relative overflow-hidden rounded-xl border border-white/[0.08] shadow-hero-vignette">
      <div className="relative aspect-[9/14] min-h-[430px] w-full bg-zinc-950 sm:aspect-[2/1] sm:min-h-[360px] lg:aspect-[21/9] lg:min-h-[400px]">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[74%_14%] transition-opacity duration-700 sm:object-[66%_18%] lg:object-[58%_20%]"
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
          className="pointer-events-none absolute inset-0 sm:hidden"
          style={{ background: HERO_SCRIM_BOTTOM_MOBILE }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 hidden sm:block"
          style={{ background: HERO_SCRIM_BOTTOM_DESKTOP }}
          aria-hidden
        />

        <div className="relative z-10 flex h-full flex-col justify-end p-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] sm:p-6 sm:pb-7 lg:p-7 lg:pb-8">
          <div className="rw-hero-copy-panel max-w-[92%] sm:max-w-[30rem] lg:max-w-[34rem]">
            <div className="rw-hero-copy-inner">
              {active.genre?.length > 0 && (
                <p className="rw-genre-label rw-hero-genre mb-1.5 text-[9px] sm:mb-2.5 sm:text-[11px]">
                  {active.genre.slice(0, 2).join(" · ")}
                </p>
              )}
              <h1 className="font-display text-[1.55rem] uppercase leading-[0.94] tracking-[0.015em] text-white sm:text-[2.7rem] lg:text-[3.1rem]">
                {active.title}
              </h1>
              {synopsis && (
                <p className="mt-1.5 line-clamp-1 max-w-[24rem] text-[11px] leading-relaxed text-zinc-200/92 sm:mt-2 sm:line-clamp-2 sm:max-w-[26rem] sm:text-sm">
                  {synopsis}
                </p>
              )}
              <div className="mt-2.5 flex flex-wrap gap-2 sm:mt-4 sm:gap-3">
                {active.firstEpisodeId ? (
                  <WatchEpisodeLink
                    episodeId={active.firstEpisodeId}
                    className="rw-btn-primary min-h-9 min-w-[110px] px-3.5 py-1.5 text-xs sm:min-h-11 sm:min-w-[138px] sm:px-4 sm:py-2 sm:text-sm"
                  >
                    Watch Now
                  </WatchEpisodeLink>
                ) : (
                  <Button
                    href={`/series/${active.slug}`}
                    className="min-h-9 min-w-[110px] px-3.5 py-1.5 text-xs sm:min-h-11 sm:min-w-[138px] sm:px-4 sm:py-2 sm:text-sm"
                  >
                    Watch Now
                  </Button>
                )}
                <Button
                  href={`/series/${active.slug}`}
                  variant="secondary"
                  className="min-h-9 min-w-[102px] px-3.5 py-1.5 text-xs sm:min-h-11 sm:min-w-[128px] sm:px-4 sm:py-2 sm:text-sm"
                >
                  More Info
                </Button>
              </div>
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
