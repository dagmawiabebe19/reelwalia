"use client";

import { useCallback, useRef, useState, type TouchEvent } from "react";
import { ReelWaliaLogo } from "@/components/brand/ReelWaliaLogo";
import { ArrowRightIcon, PlayIcon } from "@/components/commercials/CommercialIcons";
import { CommercialInlineVideo } from "@/components/commercials/CommercialInlineVideo";
import { useCommercialPlayback } from "@/components/commercials/CommercialPlayback";
import {
  COMMERCIAL_FORM_ANCHOR,
  COMMERCIAL_GALLERY_ANCHOR,
  type Commercial,
} from "@/lib/commercials/constants";

const SWIPE_MIN_PX = 48;

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
      className={`w-full rounded-2xl border border-white/[0.08] bg-black shadow-none md:mx-auto md:rounded-[1.75rem] md:border-white/10 md:shadow-[0_30px_80px_rgba(0,0,0,0.7),0_0_90px_rgba(229,57,53,0.22)] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:w-auto lg:justify-self-center ${
        square
          ? "aspect-video md:aspect-square md:w-[min(80vw,19rem)] lg:h-[min(56vh,30rem)] lg:w-auto lg:aspect-auto"
          : "aspect-video md:aspect-[9/16] md:w-60 lg:h-[min(62vh,38rem)] lg:w-auto lg:aspect-auto"
      }`}
      overlay={({ idle }) => (
        <>
          <button
            type="button"
            onClick={() => openPlayer(commercial)}
            aria-label={`Watch ${commercial.title} with sound`}
            className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-commercial-red md:rounded-[1.75rem]"
          />
          {idle && <HeroPlayButton commercial={commercial} className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/30 to-transparent px-4 pb-4 pr-14 pt-16">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-commercial-red">
              {commercial.is_featured ? "Featured" : "Latest work"}
            </p>
            <p className="mt-1 line-clamp-2 font-display text-sm uppercase leading-tight tracking-wide text-white md:text-lg">
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
      className="aspect-video w-full rounded-2xl border border-white/[0.08] bg-black md:rounded-2xl md:border-white/10 lg:absolute lg:inset-0 lg:z-0 lg:aspect-auto lg:rounded-none lg:border-0"
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

function HeroDots({
  slides,
  activeIndex,
  onSelect,
  className = "",
}: {
  slides: Commercial[];
  activeIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}) {
  if (slides.length < 2) return null;
  return (
    <div className={`flex justify-center gap-2 ${className}`} role="tablist" aria-label="Featured advertisements">
      {slides.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-label={`Show ${item.title}`}
          aria-current={index === activeIndex ? "true" : undefined}
          onClick={() => onSelect(index)}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            index === activeIndex ? "w-6 bg-commercial-red" : "w-1.5 bg-white/30 hover:bg-white/50"
          }`}
        />
      ))}
    </div>
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
  const touchX = useRef<number | null>(null);
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

  const onTouchStart = (e: TouchEvent) => {
    touchX.current = e.changedTouches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchX.current;
    touchX.current = null;
    if (start == null || count < 2) return;
    const end = e.changedTouches[0]?.clientX;
    if (end == null) return;
    const delta = end - start;
    if (Math.abs(delta) < SWIPE_MIN_PX) return;
    if (delta < 0) goNext();
    else goPrev();
  };

  const wide = active?.aspect_ratio === "16:9";
  const framed = Boolean(active) && !wide;

  return (
    <section
      className="commercial-hero relative isolate overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={`absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(229,57,53,0.22),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(183,28,28,0.18),transparent_50%)] ${
          wide ? "lg:hidden" : ""
        }`}
      />

      <div
        className={`mx-auto grid max-w-7xl gap-y-3 px-5 pb-8 pt-4 sm:gap-y-6 sm:px-8 sm:pb-14 sm:pt-10 lg:gap-x-16 lg:gap-y-0 lg:py-8 ${
          framed ? "lg:grid-cols-[1.15fr_0.85fr] lg:grid-rows-[auto_auto] lg:content-center" : ""
        } ${wide ? "lg:min-h-[min(78vh,46rem)] lg:content-center" : ""}`}
      >
        <div className={`relative z-10 ${framed ? "lg:self-end" : "lg:max-w-4xl"}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-commercial-red md:hidden">
            Advertisements
          </p>
          <div className="hidden items-center gap-3 md:flex">
            <ReelWaliaLogo variant="mark" markClassName="h-10 w-10 sm:h-12 sm:w-12" />
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-commercial-red">
              ReelWalia Studio · Advertisements
            </p>
          </div>
          <h1 className="commercial-headline mt-2.5 font-display text-[2.25rem] uppercase leading-[0.95] tracking-[0.01em] text-white [text-wrap:balance] sm:mt-4 sm:text-6xl lg:text-[4rem] xl:text-7xl">
            We make advertisements that <span className="text-commercial-red">stop the scroll</span>
          </h1>
        </div>

        {active &&
          (wide ? (
            <WideHeroVideo key={active.id} commercial={active} />
          ) : (
            <FramedHeroVideo key={active.id} commercial={active} />
          ))}

        <HeroDots
          slides={slides}
          activeIndex={safeIndex}
          onSelect={goTo}
          className="relative z-10 md:hidden"
        />

        <div className={`relative z-10 ${framed ? "lg:self-start lg:pt-6" : "lg:max-w-4xl lg:pt-6"}`}>
          <p className="max-w-[22rem] text-base leading-snug text-white/70 sm:max-w-xl sm:leading-relaxed sm:text-zinc-300 sm:text-lg">
            Story-driven advertisements from the team behind ReelWalia&apos;s dramas.
            <span className="hidden sm:inline">
              {" "}
              We hook viewers in the first second and keep them watching to the end.
            </span>
          </p>

          <div id="hero-ctas" className="mt-4 flex flex-row gap-3 sm:mt-7 sm:flex-row">
            <a
              href={`#${COMMERCIAL_GALLERY_ANCHOR}`}
              className="commercial-btn-primary inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-commercial-red to-commercial-deep px-4 text-xs font-bold uppercase tracking-[0.08em] text-white shadow-none transition hover:from-commercial-deep hover:to-commercial-deep sm:h-auto sm:flex-none sm:px-7 sm:py-3.5 sm:text-sm sm:tracking-[0.14em] sm:shadow-[0_10px_40px_rgba(229,57,53,0.35)]"
            >
              See our work
            </a>
            <a
              href={`#${COMMERCIAL_FORM_ANCHOR}`}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/[0.04] px-4 text-xs font-bold uppercase tracking-[0.08em] text-white backdrop-blur transition hover:border-white/50 hover:bg-white/[0.08] sm:h-auto sm:flex-none sm:px-7 sm:py-3.5 sm:text-sm sm:tracking-[0.14em]"
            >
              Get a quote
              <ArrowRightIcon className="hidden h-4 w-4 sm:inline" />
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
            className="absolute left-2 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-sm transition hover:scale-105 hover:bg-black/70 md:flex sm:left-4 sm:h-12 sm:w-12"
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next featured advertisement"
            className="absolute right-2 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-sm transition hover:scale-105 hover:bg-black/70 md:flex sm:right-4 sm:h-12 sm:w-12"
          >
            <ArrowIcon direction="right" />
          </button>
          <HeroDots
            slides={slides}
            activeIndex={safeIndex}
            onSelect={goTo}
            className="absolute bottom-4 left-1/2 z-30 hidden -translate-x-1/2 md:flex sm:bottom-6"
          />
        </>
      )}
    </section>
  );
}
