/**
 * Paywall marketing copy — edit here. Do not invent prices, discounts, or reviews.
 */

export const PAYWALL_HEADLINE = "Get Full Access Pass to Binge Worthy Drama Series";
export const PAYWALL_SUBHEAD = "Watch the full series. Pick a plan that fits.";
export const PAYWALL_CATALOG_HEADING = "Popular Drama Series";

/** Shown when the viewer finishes the last published episode — honest catalog framing. */
export const PAYWALL_END_OF_SERIES_HEADLINE =
  "Enjoyed this? Get unlimited access to every ReelWalia series";
export const PAYWALL_END_OF_SERIES_SUBHEAD =
  "Your pass unlocks the full catalog — binge every drama on ReelWalia.";

export type PaywallCopyVariant = "default" | "end_of_final_episode";

export function paywallCopyForVariant(
  variant: PaywallCopyVariant = "default",
  opts?: { moreEpisodesComingSoon?: boolean }
): { headline: string; subhead: string } {
  if (variant === "end_of_final_episode") {
    const subhead = opts?.moreEpisodesComingSoon
      ? `${PAYWALL_END_OF_SERIES_SUBHEAD} More episodes of this series are coming soon.`
      : PAYWALL_END_OF_SERIES_SUBHEAD;
    return {
      headline: PAYWALL_END_OF_SERIES_HEADLINE,
      subhead,
    };
  }

  return {
    headline: PAYWALL_HEADLINE,
    subhead: PAYWALL_SUBHEAD,
  };
}

export const PAYWALL_INCLUDED = [
  {
    id: "unlimited",
    label: "Unlimited access to every series",
  },
  {
    id: "devices",
    label: "Watch on any device",
  },
  {
    id: "hd",
    label: "Stream in HD",
  },
  {
    id: "no-ads",
    label: "No ads, no interruptions",
  },
  {
    id: "new",
    label: "New Drama Series Every Month",
  },
] as const;

/**
 * Fill with REAL testimonials before showing names/quotes in production.
 * Empty quote/attribution entries are skipped. Set `enabled: false` to hide
 * the whole block until you have real reviews.
 */
export const PAYWALL_SOCIAL_PROOF = {
  enabled: true,
  /** Set to a real average (e.g. 4.8) once you have reviews. Null hides stars. */
  rating: null as number | null,
  /** e.g. "Based on 48 viewer ratings" — leave empty until true. */
  ratingCaption: "",
  testimonials: [
    {
      quote: "",
      attribution: "",
    },
    {
      quote: "",
      attribution: "",
    },
  ],
};

export function publishedPaywallTestimonials(): { quote: string; attribution: string }[] {
  return PAYWALL_SOCIAL_PROOF.testimonials.filter(
    (t) => t.quote.trim().length > 0
  );
}
