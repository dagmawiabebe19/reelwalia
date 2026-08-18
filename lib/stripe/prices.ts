import type Stripe from "stripe";
import { getPlanDisplay, type StripePlanKey } from "@/lib/stripe/plans";

/** Legacy unused standard-price env keys (not used for new checkouts). */
export const LEGACY_STANDARD_PRICE_ENV_KEYS: Record<StripePlanKey, string> = {
  "1week": "STRIPE_PRICE_1WEEK_STANDARD",
  "2week": "STRIPE_PRICE_2WEEK_STANDARD",
  "1month": "STRIPE_PRICE_1MONTH_STANDARD",
};

export function getStripePriceEnvKeys(): string[] {
  return Object.keys(process.env)
    .filter((k) => k.startsWith("STRIPE_PRICE"))
    .sort();
}

export function getCheckoutPriceId(plan: StripePlanKey): string {
  const display = getPlanDisplay(plan);
  const priceId = process.env[display.priceEnvKey]?.trim() ?? "";
  if (!priceId) {
    const available = getStripePriceEnvKeys();
    console.error(
      `[stripe/prices] plan="${plan}" missing:`,
      display.priceEnvKey,
      "| Available STRIPE_PRICE keys:",
      available.length > 0
        ? available.join(", ")
        : "(none — restart the server after editing env vars)"
    );
    throw new Error(
      `Missing Stripe price env vars for plan: ${plan} (${display.priceEnvKey})`
    );
  }
  return priceId;
}

/** Recurring price ID for checkout and renewals. */
export function getPlanPriceIds(plan: StripePlanKey): {
  introPriceId: string;
  /** Legacy standard price — unused; renewals bill introPriceId only. */
  standardPriceId?: string;
} {
  const introPriceId = getCheckoutPriceId(plan);
  const standardKey = LEGACY_STANDARD_PRICE_ENV_KEYS[plan];
  const standardPriceId = process.env[standardKey]?.trim() ?? "";
  return {
    introPriceId,
    ...(standardPriceId ? { standardPriceId } : {}),
  };
}

/**
 * Load the Stripe Price used at checkout and refuse if it does not match the
 * displayed plan amount. Prevents charging $4.24 while showing $1.75.
 */
export async function resolveVerifiedCheckoutPrice(params: {
  stripe: Stripe;
  plan: StripePlanKey;
}): Promise<{ priceId: string; amountCents: number }> {
  const display = getPlanDisplay(params.plan);
  const priceId = getCheckoutPriceId(params.plan);
  const price = await params.stripe.prices.retrieve(priceId);

  const unit = price.unit_amount;
  const interval = price.recurring?.interval;
  const intervalCount = price.recurring?.interval_count ?? 1;

  if (!price.active) {
    throw new Error(
      `Stripe Price ${priceId} for ${params.plan} is inactive. Checkout blocked.`
    );
  }
  if (price.currency !== "usd") {
    throw new Error(
      `Stripe Price ${priceId} currency is ${price.currency}, expected usd. Checkout blocked.`
    );
  }
  if (unit !== display.amountCents) {
    throw new Error(
      `Price mismatch: ${params.plan} displays ${display.amountCents} cents but Stripe Price ${priceId} charges ${unit} cents. Checkout blocked.`
    );
  }
  if (interval !== display.stripeInterval || intervalCount !== display.stripeIntervalCount) {
    throw new Error(
      `Stripe Price ${priceId} interval ${interval}/${intervalCount} does not match ${display.stripeInterval}/${display.stripeIntervalCount} for ${params.plan}. Checkout blocked.`
    );
  }

  return { priceId, amountCents: display.amountCents };
}
