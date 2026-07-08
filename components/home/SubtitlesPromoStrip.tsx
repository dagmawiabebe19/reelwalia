import { SUBTITLES_PROMO } from "@/lib/marketing/subtitles-promo";

export function SubtitlesPromoStrip() {
  return (
    <section className="rounded-lg border border-white/[0.08] bg-zinc-950/65 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0 rounded-full border border-obsidian-red/45 bg-obsidian-red/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-obsidian-red sm:text-[10px]">
          {SUBTITLES_PROMO.badge}
        </span>
        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-300 sm:text-sm">
          {SUBTITLES_PROMO.languages.join(" · ")}
        </p>
      </div>
    </section>
  );
}

