import type { ComponentType, SVGProps } from "react";
import {
  BoltIcon,
  ClapperIcon,
  TargetIcon,
  TrophyIcon,
} from "@/components/commercials/CommercialIcons";
import { COMMERCIAL_FORM_ANCHOR } from "@/lib/commercials/constants";

const VALUE_PROPS: { title: string; body: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  {
    title: "Hollywood-trained team",
    body: "Directed and edited by filmmakers with credits on Netflix, Hulu, and Tribeca productions.",
    Icon: TrophyIcon,
  },
  {
    title: "Cinematic storytelling",
    body: "We produce microdramas for a living. Hooks, tension, and payoff in under 60 seconds is our craft.",
    Icon: ClapperIcon,
  },
  {
    title: "Fast turnaround",
    body: "A lean in-house crew and a tight process take you from brief to final cut in weeks, not months.",
    Icon: BoltIcon,
  },
  {
    title: "Built for the feed",
    body: "Pacing, captions, and safe zones tuned for TikTok, Reels, and Shorts, so the ad lands on every platform.",
    Icon: TargetIcon,
  },
];

const STEPS: { title: string; body: string }[] = [
  { title: "Tell us about your brand", body: "Share your product, audience, and goals. A short form or a quick call is enough." },
  { title: "Concept & script", body: "We pitch story-driven concepts, then lock the script and shot list with you." },
  { title: "Production", body: "Casting, locations, and a cinematic shoot, run by the team behind our dramas." },
  { title: "Delivery in every format", body: "Final cuts with captions, sized for every platform you run on." },
];

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-commercial-red sm:text-xs sm:tracking-[0.28em]">
      {children}
    </p>
  );
}

export function CommercialValueProps() {
  return (
    <section className="commercial-why border-t border-white/[0.06] py-8 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Eyebrow>Why ReelWalia</Eyebrow>
        <h2 className="mt-3 max-w-2xl font-display text-[1.9rem] uppercase leading-none tracking-wide text-white sm:text-5xl">
          Storytellers first. Advertisers second.
        </h2>
        <div className="mt-8 grid gap-3 sm:mt-12 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map(({ title, body, Icon }) => (
            <div
              key={title}
              className="commercial-value rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent p-5 sm:p-6"
            >
              <div className="flex items-center gap-3 sm:block">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-commercial-red/15 text-commercial-red ring-1 ring-commercial-red/30 sm:h-11 sm:w-11">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-base uppercase tracking-wide text-white sm:mt-5 sm:text-xl">
                  {title}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400 sm:mt-2">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CommercialProcess() {
  return (
    <section className="commercial-process border-t border-white/[0.06] py-8 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-3 font-display text-[1.9rem] uppercase leading-none tracking-wide text-white sm:text-5xl">
          From brief to final cut
        </h2>

        {/* Mobile timeline */}
        <ol className="relative mt-8 space-y-6 sm:hidden">
          <span
            className="absolute bottom-2 left-[0.9rem] top-2 w-px bg-white/10"
            aria-hidden
          />
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative grid grid-cols-[2.25rem_1fr] gap-3">
              <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-commercial-bg font-display text-sm leading-none text-commercial-red ring-1 ring-commercial-red/40">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-display text-base uppercase tracking-wide text-white">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Desktop / tablet cards */}
        <ol className="mt-12 hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="commercial-step relative rounded-2xl border border-white/[0.07] p-6">
              <span className="font-display text-5xl leading-none text-commercial-red/90">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 font-display text-xl uppercase tracking-wide text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function CommercialFooterCta() {
  return (
    <section className="commercial-footer-cta border-t border-white/[0.06] bg-gradient-to-b from-commercial-deep/25 to-transparent py-16 text-center sm:py-20">
      <div className="mx-auto max-w-3xl px-5">
        <h2 className="font-display text-[1.9rem] uppercase leading-tight tracking-wide text-white sm:text-5xl">
          Your story, told in seconds
        </h2>
        <a
          href={`#${COMMERCIAL_FORM_ANCHOR}`}
          className="mt-8 inline-flex h-12 w-full max-w-sm items-center justify-center rounded-full bg-gradient-to-r from-commercial-red to-commercial-deep px-8 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:from-commercial-deep hover:to-commercial-deep sm:h-auto sm:w-auto sm:py-3.5 sm:tracking-[0.14em]"
        >
          Get a Quote
        </a>
      </div>
    </section>
  );
}
