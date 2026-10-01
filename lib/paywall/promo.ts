import {
  formatEtb,
  getPlanPricing,
  type PaymentProvider,
  type PlanKey,
} from "@/lib/payments/pricing";
import { formatUsd } from "@/lib/stripe/plans";

/**
 * Single source for paywall promo/urgency. Nothing here is decorative: a
 * discount needs a real pre-promo price, and urgency needs a real live count.
 * With no data the banner is not rendered at all.
 */
export interface PaywallPromoConfig {
  /** Short label, e.g. "Launch price". */
  label: string;
  /**
   * Real list prices before the promo, in minor units (cents / santim), per
   * provider and plan. Shown struck-through only when higher than the price
   * actually charged (lib/payments/pricing.ts).
   */
  originalPriceMinor: Partial<Record<PaymentProvider, Partial<Record<PlanKey, number>>>>;
}

/** Live launch-cohort cap. Must come from real data (e.g. a DB count), never a constant. */
export interface LaunchCap {
  total: number;
  claimed: number;
}

/** No genuine promo is running. Set this only when the original prices are real. */
export const PAYWALL_PROMO: PaywallPromoConfig | null = null;

export interface PaywallPromoDisplay {
  discount: {
    label: string;
    original: string;
    current: string;
  } | null;
  cap: { claimed: number; total: number; text: string } | null;
}

function formatMinor(provider: PaymentProvider, minor: number): string {
  return provider === "chapa" ? formatEtb(minor / 100) : formatUsd(minor / 100);
}

/** Returns null when there is nothing truthful to show. */
export function resolvePaywallPromo(input: {
  provider: PaymentProvider | null;
  plan: PlanKey;
  config?: PaywallPromoConfig | null;
  cap?: LaunchCap | null;
}): PaywallPromoDisplay | null {
  const config = input.config === undefined ? PAYWALL_PROMO : input.config;

  let discount: PaywallPromoDisplay["discount"] = null;
  if (config && input.provider) {
    const original = config.originalPriceMinor[input.provider]?.[input.plan];
    const current = getPlanPricing(input.provider, input.plan).amountMinor;
    if (typeof original === "number" && Number.isFinite(original) && original > current) {
      discount = {
        label: config.label,
        original: formatMinor(input.provider, original),
        current: formatMinor(input.provider, current),
      };
    }
  }

  let cap: PaywallPromoDisplay["cap"] = null;
  const c = input.cap;
  if (
    c &&
    Number.isInteger(c.total) &&
    Number.isInteger(c.claimed) &&
    c.total > 0 &&
    c.claimed >= 0 &&
    c.claimed < c.total
  ) {
    cap = {
      claimed: c.claimed,
      total: c.total,
      text: `${c.claimed.toLocaleString("en-US")} of ${c.total.toLocaleString("en-US")} launch passes claimed`,
    };
  }

  return discount || cap ? { discount, cap } : null;
}
