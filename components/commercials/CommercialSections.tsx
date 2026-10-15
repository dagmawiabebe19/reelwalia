import type { ComponentType, SVGProps } from "react";
import {
  BoltIcon,
  ClapperIcon,
  PhoneVerticalIcon,
  TargetIcon,
} from "@/components/commercials/CommercialIcons";
import { COMMERCIAL_FORM_ANCHOR } from "@/lib/commercials/constants";

const VALUE_PROPS: { title: string; body: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  {
    title: "Vertical-native",
    body: "Shot and framed for 9:16 from the first storyboard, not cropped from a landscape cut.",
    Icon: PhoneVerticalIcon,
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
  { title: "Delivery in every format", body: "Final cuts in 9:16, 1:1, and 16:9 with captions, ready for every platform you run on." },
];

function Eyebrow({ children }: { children: string }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.28em] text-commercial-red">{children}</p>;
}

export function CommercialValueProps() {
  return (
    <section className="commercial-why border-t border-white/[0.06] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Eyebrow>Why ReelWalia</Eyebrow>
        <h2 className="mt-3 max-w-2xl font-display text-4xl uppercase leading-none tracking-wide text-white sm:text-5xl">
          Storytellers first. Advertisers second.
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map(({ title, body, Icon }) => (
            <div
              key={title}
              className="commercial-value rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent p-6"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-commercial-red/15 text-commercial-red ring-1 ring-commercial-red/30">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-display text-xl uppercase tracking-wide text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CommercialProcess() {
  return (
    <section className="commercial-process border-t border-white/[0.06] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-3 font-display text-4xl uppercase leading-none tracking-wide text-white sm:text-5xl">
          From brief to final cut
        </h2>
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <h2 className="font-display text-3xl uppercase leading-tight tracking-wide text-white sm:text-5xl">
          Your story, told in seconds
        </h2>
        <a
          href={`#${COMMERCIAL_FORM_ANCHOR}`}
          className="mt-8 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-commercial-red to-commercial-deep px-8 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:from-commercial-deep hover:to-commercial-deep"
        >
          Get a Quote
        </a>
      </div>
    </section>
  );
}
