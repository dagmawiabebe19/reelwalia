"use client";

import { useCallback, useState } from "react";
import { ReelWaliaLogo } from "@/components/brand/ReelWaliaLogo";
import { ArrowRightIcon, PlayIcon } from "@/components/commercials/CommercialIcons";
import { CommercialInlineVideo } from "@/components/commercials/CommercialInlineVideo";
import { useCommercialPlayback } from "@/components/commercials/CommercialPlayback";
import {
  COMMERCIAL_FORM_ANCHOR,
  COMMERCIAL_GALLERY_ANCHOR,
  type Commercial,
} from "@/lib/commercials/constants";

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      {direction === "left" ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 5l-7 7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      )}
    </svg>
  );
}

function HeroPlayButton({ commercial, className }: { commercial: Commercial; className: string }) {
  const { openPlayer } = useCommercialPlayback();
  return (
    <button
      type="button"
      onClick={() => openPlayer(commercial)}
      aria-label={`Play ${commercial.title}`}
      className={`absolute z-20 flex h-14 w-14 items-center justify-center rounded-full bg-commercial-red text-white shadow-[0_10px_30px_rgba(229,57,53,0.45)] ring-1 ring-white/25 transition hover:scale-105 ${className}`}
    >
      <PlayIcon className="ml-0.5 h-6 w-6" />
    </button>
  );
}

function FramedHeroVideo({ commercial }: { commercial: Commercial }) {
  const { openPlayer } = useCommercialPlayback();
  const square = commercial.aspect_ratio === "1:1";
  return (
    <CommercialInlineVideo
      commercial={commercial}
      priority
      hint
      toggleClassName="bottom-3 right-3"
      className={`mx-auto rounded-[1.75rem] border border-white/10 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.7),0_0_90px_rgba(229,57,53,0.22)] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:w-auto lg:justify-self-center ${
        square
          ? "w-[min(80vw,19rem)] lg:h-[min(56vh,30rem)]"
          : "w-[min(58vw,14rem)] sm:w-60 lg:h-[min(62vh,38rem)]"
      }`}
      style={{ aspectRatio: square ? "1 / 1" : "9 / 16" }}
      overlay={({ idle }) => (
        <>
          <button
            type="button"
            onClick={() => openPlayer(commercial)}
            aria-label={`Watch ${commercial.title} with sound`}
            className="absolute inset-0 z-10 rounded-[1.75rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-commercial-red"
          />
          {idle && <HeroPlayButton commercial={commercial} className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/30 to-transparent px-4 pb-4 pr-16 pt-16">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-commercial-red">
              {commercial.is_featured ? "Featured" : "Latest work"}
            </p>
            <p className="mt-1 line-clamp-2 font-display text-lg uppercase leading-tight tracking-wide text-white">
              {commercial.title}
            </p>
          </div>
        </>
      )}
    />
  );
}

/** Inline 16:9 box on mobile; full-bleed behind the copy (with the dark scrims) on desktop. */
function WideHeroVideo({ commercial }: { commercial: Commercial }) {
  return (
    <CommercialInlineVideo
      commercial={commercial}
      priority
      hint
      toggleClassName="bottom-3 right-3 lg:bottom-8 lg:right-8"
      className="aspect-video w-full rounded-2xl border border-white/10 bg-black lg:absolute lg:inset-0 lg:z-0 lg:aspect-auto lg:rounded-none lg:border-0"
      overlay={({ idle }) => (
        <>
          <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-b from-black/25 via-transparent via-60% to-commercial-bg lg:block" />
          <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-black/75 via-black/30 via-40% to-transparent to-70% lg:block" />
          {idle && (
            <HeroPlayButton
              commercial={commercial}
              className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-auto lg:right-8 lg:top-auto lg:bottom-8 lg:translate-x-0 lg:translate-y-0"
            />
          )}
        </>
      )}
    />
  );
}

export function CommercialHero({
  heroes,
  /** @deprecated Prefer `heroes`. Kept so older call sites keep working. */
  hero,
}: {
  heroes?: Commercial[];
  hero?: Commercial | null;
}) {
  const slides = heroes ?? (hero ? [hero] : []);
  const count = slides.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = count === 0 ? 0 : ((activeIndex % count) + count) % count;
  const active = slides[safeIndex] ?? null;

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return;
      setActiveIndex(((index % count) + count) % count);
    },
    [count]
  );
  const goNext = useCallback(() => goTo(safeIndex + 1), [goTo, safeIndex]);
  const goPrev = useCallback(() => goTo(safeIndex - 1), [goTo, safeIndex]);

  const wide = active?.aspect_ratio === "16:9";
  const framed = Boolean(active) && !wide;

  return (
    <section className="commercial-hero relative isolate overflow-hidden">
      <div
        className={`absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(229,57,53,0.22),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(183,28,28,0.18),transparent_50%)] ${
          wide ? "lg:hidden" : ""
        }`}
      />

      <div
        className={`mx-auto grid max-w-7xl gap-y-6 px-5 pb-10 pt-6 sm:px-8 sm:pb-14 sm:pt-10 lg:gap-x-16 lg:gap-y-0 lg:py-8 ${
          framed ? "lg:grid-cols-[1.15fr_0.85fr] lg:grid-rows-[auto_auto] lg:content-center" : ""
        } ${wide ? "lg:min-h-[min(78vh,46rem)] lg:content-center" : ""}`}
      >
        <div className={`relative z-10 ${framed ? "lg:self-end" : "lg:max-w-4xl"}`}>
          <div className="flex items-center gap-3">
            <ReelWaliaLogo variant="mark" markClassName="h-10 w-10 sm:h-12 sm:w-12" />
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-commercial-red">
              ReelWalia Studio · Advertisements
            </p>
          </div>
          <h1 className="commercial-headline mt-4 font-display text-[2.4rem] uppercase leading-[0.95] tracking-[0.01em] text-white [text-wrap:balance] sm:text-6xl lg:text-[4rem] xl:text-7xl">
            We make advertisements that <span className="text-commercial-red">stop the scroll</span>
          </h1>
        </div>

        {active &&
          (wide ? (
            <WideHeroVideo key={active.id} commercial={active} />
          ) : (
            <FramedHeroVideo key={active.id} commercial={active} />
          ))}

        <div className={`relative z-10 ${framed ? "lg:self-start lg:pt-6" : "lg:max-w-4xl lg:pt-6"}`}>
          <p className="max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            Story-driven advertisements from the team behind ReelWalia&apos;s dramas.
            We hook viewers in the first second and keep them watching to the end.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href={`#${COMMERCIAL_GALLERY_ANCHOR}`}
              className="commercial-btn-primary inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-commercial-red to-commercial-deep px-7 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_10px_40px_rgba(229,57,53,0.35)] transition hover:from-commercial-deep hover:to-commercial-deep"
            >
              See Our Work
            </a>
            <a
              href={`#${COMMERCIAL_FORM_ANCHOR}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/[0.04] px-7 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-white backdrop-blur transition hover:border-white/50 hover:bg-white/[0.08]"
            >
              Get a Quote
              <ArrowRightIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous featured advertisement"
            className="absolute left-2 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-sm transition hover:scale-105 hover:bg-black/70 sm:left-4 sm:h-12 sm:w-12"
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next featured advertisement"
            className="absolute right-2 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-sm transition hover:scale-105 hover:bg-black/70 sm:right-4 sm:h-12 sm:w-12"
          >
            <ArrowIcon direction="right" />
          </button>
          <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-2 sm:bottom-6">
            {slides.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show ${item.title}`}
                aria-current={index === safeIndex ? "true" : undefined}
                onClick={() => goTo(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === safeIndex ? "w-8 bg-commercial-red" : "w-4 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
