"use client";

import { useEffect, useState } from "react";
import { useCommercialPlayback } from "@/components/commercials/CommercialPlayback";
import { COMMERCIAL_FORM_ANCHOR } from "@/lib/commercials/constants";

/**
 * Mobile-only slim "Get a quote" bar. Appears after the hero CTAs leave the
 * viewport, and hides while the inquiry form is on screen or the player is open.
 */
export function CommercialStickyCta() {
  const { playerOpen } = useCommercialPlayback();
  const [heroGone, setHeroGone] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero-ctas");
    const form = document.getElementById(COMMERCIAL_FORM_ANCHOR);
    if (!hero && !form) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target.id === "hero-ctas") setHeroGone(!entry.isIntersecting);
          if (entry.target.id === COMMERCIAL_FORM_ANCHOR) setFormVisible(entry.isIntersecting);
        }
      },
      { threshold: 0.08 }
    );
    if (hero) observer.observe(hero);
    if (form) observer.observe(form);
    return () => observer.disconnect();
  }, []);

  const show = heroGone && !formVisible && !playerOpen;
  if (!show) return null;

  return (
    <div className="commercial-sticky-cta fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/90 px-5 pt-2.5 backdrop-blur-md md:hidden pb-[max(0.625rem,env(safe-area-inset-bottom))]">
      <a
        href={`#${COMMERCIAL_FORM_ANCHOR}`}
        className="flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-commercial-red to-commercial-deep text-sm font-bold uppercase tracking-[0.08em] text-white"
      >
        Get a quote
      </a>
    </div>
  );
}
