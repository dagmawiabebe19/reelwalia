import type { Metadata } from "next";
import { ReelWaliaWordmark } from "@/components/brand/ReelWaliaLogo";
import {
  ConceptMark,
  LOGO_CONCEPTS,
  ProductionMarkSvg,
} from "@/components/brand/logo-concepts/LogoConcepts";

export const metadata: Metadata = {
  title: "Logo Concepts — ReelWalia",
  robots: { index: false, follow: false },
};

const SIZE_ROWS = [
  { label: "Favicon 16px", size: 16 },
  { label: "Favicon 32px", size: 32 },
  { label: "Navbar 44px", size: 44 },
  { label: "Mobile 56px", size: 56 },
] as const;

export default function LogoConceptsPage() {
  return (
    <div className="min-h-screen bg-black px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 border-b border-white/10 pb-10 text-center">
          <ProductionMarkSvg className="mx-auto h-16 w-16 sm:h-20 sm:w-20" />
          <ReelWaliaWordmark className="mt-6 block text-3xl sm:text-4xl" />
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            15 mark explorations. Production:{" "}
            <strong className="font-semibold text-obsidian-red">
              Red Stream Pod Premium
            </strong>{" "}
            — glossy 3D capsule, hero play, flat variant for favicons.
          </p>
        </header>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {LOGO_CONCEPTS.map((concept) => (
            <article
              key={concept.id}
              className={`rounded-xl border p-5 ${
                concept.selected
                  ? "border-obsidian-red/50 bg-obsidian-red/[0.06] ring-1 ring-obsidian-red/30"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-white">{concept.label}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {concept.description}
                  </p>
                </div>
                {concept.selected && (
                  <span className="shrink-0 rounded-full bg-obsidian-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Live
                  </span>
                )}
              </div>

              <div className="space-y-3 rounded-lg bg-black p-4">
                {SIZE_ROWS.map(({ label, size }) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="text-xs text-zinc-500">{label}</span>
                    <div className="flex items-center gap-3">
                      <ConceptMark concept={concept} size={size} />
                      {concept.selected && size >= 44 && (
                        <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                          <ConceptMark concept={concept} size={size} />
                          <span className="font-display text-sm uppercase text-white">
                            Reel<span className="text-obsidian-red"> Walia</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
