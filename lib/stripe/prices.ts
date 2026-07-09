import type { StripePlanKey } from "@/lib/stripe/plans";

/**
 * Env var name per subscription plan — keep in sync with `.env.example`.
 * Each maps to a recurring Stripe price used for checkout + renewals.
 */
export const PLAN_PRICE_ENV_KEYS: Record<StripePlanKey, string> = {
  "1week": "STRIPE_PRICE_WEEKLY",
  "1month": "STRIPE_PRICE_MONTHLY",
};

/** Env var for the one-time "unlock all episodes of a series" price. */
export const SERIES_UNLOCK_PRICE_ENV_KEY = "STRIPE_PRICE_SERIES_UNLOCK";

export function getStripePriceEnvKeys(): string[] {
  return Object.keys(process.env)
    .filter((k) => k.startsWith("STRIPE_PRICE"))
    .sort();
}

function readPriceId(envKey: string, context: string): string {
  const priceId = process.env[envKey]?.trim() ?? "";
  if (!priceId) {
    const available = getStripePriceEnvKeys();
    console.error(
      `[stripe/prices] ${context} missing:`,
      envKey,
      "| Available STRIPE_PRICE keys:",
      available.length > 0
        ? available.join(", ")
        : "(none — restart dev server after editing .env.local)"
    );
    throw new Error(`Missing Stripe price env var: ${envKey}`);
  }
  return priceId;
}

/** Recurring price ID for a subscription plan (checkout + renewals). */
export function getSubscriptionPriceId(plan: StripePlanKey): string {
  return readPriceId(PLAN_PRICE_ENV_KEYS[plan], `plan="${plan}"`);
}

/** One-time price ID that unlocks all episodes of a series for the buyer. */
export function getSeriesUnlockPriceId(): string {
  return readPriceId(SERIES_UNLOCK_PRICE_ENV_KEY, "series_unlock");
}
