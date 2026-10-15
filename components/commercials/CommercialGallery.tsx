"use client";

import { useCallback, useMemo, useState } from "react";
import { CommercialCard } from "@/components/commercials/CommercialCard";
import { CommercialPlayerModal } from "@/components/commercials/CommercialPlayerModal";
import {
  COMMERCIAL_FORM_ANCHOR,
  COMMERCIAL_GALLERY_ANCHOR,
  COMMERCIAL_REFERENCE_EVENT,
  type Commercial,
} from "@/lib/commercials/constants";

const ALL = "All";

export function commercialCategories(commercials: Commercial[]): string[] {
  const seen = new Set<string>();
  for (const c of commercials) {
    const cat = c.category?.trim();
    if (cat) seen.add(cat);
  }
  return [ALL, ...Array.from(seen)];
}

export function CommercialGallery({ commercials }: { commercials: Commercial[] }) {
  const [category, setCategory] = useState(ALL);
  const [open, setOpen] = useState<Commercial | null>(null);
  const categories = useMemo(() => commercialCategories(commercials), [commercials]);
  const visible =
    category === ALL ? commercials : commercials.filter((c) => c.category?.trim() === category);

  const close = useCallback(() => setOpen(null), []);
  const wantOne = useCallback((c: Commercial) => {
    setOpen(null);
    window.dispatchEvent(new CustomEvent(COMMERCIAL_REFERENCE_EVENT, { detail: { id: c.id } }));
    requestAnimationFrame(() => {
      document.getElementById(COMMERCIAL_FORM_ANCHOR)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    <section id={COMMERCIAL_GALLERY_ANCHOR} className="commercial-gallery scroll-mt-6 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-commercial-red">Our Work</p>
            <h2 className="mt-3 font-display text-4xl uppercase leading-none tracking-wide text-white sm:text-5xl">
              Made to be watched
            </h2>
          </div>
          {commercials.length > 0 && categories.length > 1 && (
            <div className="commercial-chip-row -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Filter by category">
              {categories.map((cat) => {
                const active = cat === category;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setCategory(cat)}
                    className={`commercial-chip shrink-0 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                      active
                        ? "border-commercial-red bg-commercial-red text-white"
                        : "border-white/15 text-zinc-300 hover:border-white/40 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {commercials.length === 0 ? (
          <div className="commercial-empty mt-10 flex flex-col items-center justify-center rounded-3xl border border-white/[0.07] bg-[radial-gradient(ellipse_at_top,rgba(229,57,53,0.14),transparent_60%)] px-6 py-20 text-center">
            <div className="flex gap-2" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-24 w-14 rounded-xl border border-white/10 bg-white/[0.03] sm:h-32 sm:w-[4.5rem]"
                  style={{ transform: `rotate(${(i - 1) * 6}deg)` }}
                />
              ))}
            </div>
            <p className="mt-8 font-display text-3xl uppercase tracking-wide text-white sm:text-4xl">
              New work dropping soon
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
              We&apos;re putting the finishing touches on our latest commercials. Tell us about your
              brand below. Yours could be the first one here.
            </p>
          </div>
        ) : (
          <div className="mt-10 columns-2 gap-4 lg:columns-4">
            {visible.map((c) => (
              <CommercialCard key={c.id} commercial={c} onOpen={setOpen} />
            ))}
          </div>
        )}
      </div>

      {open && <CommercialPlayerModal commercial={open} onClose={close} onWantOne={wantOne} />}
    </section>
  );
}
