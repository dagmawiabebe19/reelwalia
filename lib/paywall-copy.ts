/**
 * Paywall marketing copy — edit here. Do not invent prices, discounts, or reviews.
 */

export const PAYWALL_HEADLINE = "Get Full Access to Every Episode";
export const PAYWALL_SUBHEAD = "Watch the full series. Pick a plan that fits.";
export const PAYWALL_CATALOG_HEADING = "Popular Drama Series";

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
