import Link from "next/link";
import { ReelWaliaLogo } from "@/components/brand/ReelWaliaLogo";
import { ArrowRightIcon } from "@/components/commercials/CommercialIcons";
import {
  COMMERCIAL_FORM_ANCHOR,
  COMMERCIAL_GALLERY_ANCHOR,
  type Commercial,
} from "@/lib/commercials/constants";

function HeroVideo({ commercial, className }: { commercial: Commercial; className: string }) {
  return (
    <video
      className={className}
      src={commercial.video_url}
      poster={commercial.thumbnail_url ?? undefined}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      tabIndex={-1}
    />
  );
}

export function CommercialHero({ featured }: { featured: Commercial | null }) {
  const wide = featured?.aspect_ratio === "16:9";
  const framed = featured && !wide;

  return (
    <section className="commercial-hero relative isolate overflow-hidden">
      {featured && wide && (
        <>
          <HeroVideo commercial={featured} className="absolute inset-0 -z-20 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/60 to-commercial-bg" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
        </>
      )}
      {!wide && (
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(229,57,53,0.22),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(183,28,28,0.18),transparent_50%)]" />
      )}

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-14 lg:min-h-[88vh] lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <div className={framed ? "" : "lg:col-span-2 lg:max-w-4xl"}>
          <Link href="/" aria-label="ReelWalia home" className="inline-flex">
            <ReelWaliaLogo variant="lockup" scale="nav" />
          </Link>

          <p className="mt-10 text-xs font-semibold uppercase tracking-[0.28em] text-commercial-red sm:mt-14">
            ReelWalia Studio · Commercials
          </p>
          <h1 className="commercial-headline mt-4 font-display text-[2.6rem] uppercase leading-[0.95] tracking-[0.01em] text-white sm:text-6xl lg:text-7xl">
            We make commercials that <span className="text-commercial-red">stop the scroll</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            Vertical-first, story-driven commercials from the team behind ReelWalia&apos;s dramas.
            We hook viewers in the first second and keep them watching to the end.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
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

        {framed && (
          <div className="relative mx-auto w-full max-w-[17rem] sm:max-w-xs lg:max-w-sm">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-commercial-red/20 blur-3xl" />
            <div
              className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.7)]"
              style={{ aspectRatio: featured.aspect_ratio === "1:1" ? "1 / 1" : "9 / 16" }}
            >
              <HeroVideo commercial={featured} className="absolute inset-0 h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent px-4 pb-4 pt-16">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-commercial-red">
                  Featured
                </p>
                <p className="mt-1 font-display text-lg uppercase leading-tight tracking-wide text-white">
                  {featured.title}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
