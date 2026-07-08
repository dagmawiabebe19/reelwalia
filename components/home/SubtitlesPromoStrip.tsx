import { SUBTITLES_PROMO } from "@/lib/marketing/subtitles-promo";

export function SubtitlesPromoStrip() {
  return (
    <section className="rounded-xl border border-white/[0.1] bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-4 sm:p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-obsidian-red/45 bg-obsidian-red/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-obsidian-red">
          {SUBTITLES_PROMO.badge}
        </span>
        <h2 className="text-base font-semibold text-white sm:text-lg">
          {SUBTITLES_PROMO.headline}
        </h2>
      </div>
      <p className="mb-3 text-sm text-zinc-300">{SUBTITLES_PROMO.subheadline}</p>
      <p className="text-sm leading-relaxed text-zinc-200 sm:text-[15px]">
        {SUBTITLES_PROMO.languages.join(" · ")}
      </p>
    </section>
  );
}

