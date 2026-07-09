import type { StripePlanKey } from "@/lib/stripe/plans";

/** Env var names per plan — keep in sync with `.env.example`. */
export const PLAN_PRICE_ENV_KEYS: Record<
  StripePlanKey,
  { intro: string; standard: string }
> = {
  "1week": {
    intro: "STRIPE_PRICE_1WEEK_INTRO",
    standard: "STRIPE_PRICE_1WEEK_STANDARD",
  },
  "2week": {
    intro: "STRIPE_PRICE_2WEEK_INTRO",
    standard: "STRIPE_PRICE_2WEEK_STANDARD",
  },
  "1month": {
    intro: "STRIPE_PRICE_1MONTH_INTRO",
    standard: "STRIPE_PRICE_1MONTH_STANDARD",
  },
};

export function getStripePriceEnvKeys(): string[] {
  return Object.keys(process.env)
    .filter((k) => k.startsWith("STRIPE_PRICE"))
    .sort();
}

/** Recurring price ID for checkout and renewals (former intro price). */
export function getPlanPriceIds(plan: StripePlanKey): {
  introPriceId: string;
  /** Legacy standard price — unused; renewals bill introPriceId only. */
  standardPriceId?: string;
} {
  const keys = PLAN_PRICE_ENV_KEYS[plan];
  const introPriceId = process.env[keys.intro]?.trim() ?? "";
  const standardPriceId = process.env[keys.standard]?.trim() ?? "";

  if (!introPriceId) {
    const available = getStripePriceEnvKeys();
    console.error(
      `[stripe/prices] plan="${plan}" missing:`,
      keys.intro,
      "| Available STRIPE_PRICE keys:",
      available.length > 0 ? available.join(", ") : "(none — restart dev server after editing .env.local)"
    );
    throw new Error(
      `Missing Stripe price env vars for plan: ${plan} (${keys.intro})`
    );
  }

  return {
    introPriceId,
    ...(standardPriceId ? { standardPriceId } : {}),
  };
}
