/**
 * Payment pricing — two independent price sets. No currency conversion in code.
 *
 * International (Stripe): unchanged — lib/stripe/plans.ts stays the source of
 * truth for USD amounts and Stripe Price IDs.
 * Ethiopian (Chapa): explicit ETB amounts + access period per plan, set here.
 */
import { STRIPE_PLANS, getPlanDisplay, type StripePlanKey } from "@/lib/stripe/plans";

export type PaymentProvider = "stripe" | "chapa";
export type PlanKey = StripePlanKey;

export const PLAN_KEYS: readonly PlanKey[] = ["1week", "2week", "1month"] as const;

export interface ChapaPlanConfig {
  key: PlanKey;
  /** Whole ETB charged via Chapa. Set explicitly — never derived from USD. */
  etbAmount: number;
  /** Access granted per verified payment. */
  periodDays: number;
}

const CHAPA_PLAN_CONFIG: Record<PlanKey, ChapaPlanConfig> = {
  "1week": { key: "1week", etbAmount: 150, periodDays: 7 },
  "2week": { key: "2week", etbAmount: 250, periodDays: 14 },
  "1month": { key: "1month", etbAmount: 550, periodDays: 30 },
};

export interface PlanPricing {
  provider: PaymentProvider;
  plan: PlanKey;
  /** Minor units (USD cents / ETB santim). */
  amountMinor: number;
  /** Major units, as sent to Chapa / shown to users. */
  amount: number;
  currency: "USD" | "ETB";
  periodDays: number;
}

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === "string" && (PLAN_KEYS as readonly string[]).includes(value);
}

export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return value === "stripe" || value === "chapa";
}

export function getChapaPlan(plan: PlanKey): ChapaPlanConfig {
  return CHAPA_PLAN_CONFIG[plan];
}

/** Server-authoritative price for (provider, plan). The client never decides the amount. */
export function getPlanPricing(provider: PaymentProvider, plan: PlanKey): PlanPricing {
  if (provider === "chapa") {
    const cfg = CHAPA_PLAN_CONFIG[plan];
    return {
      provider,
      plan,
      amount: cfg.etbAmount,
      amountMinor: Math.round(cfg.etbAmount * 100),
      currency: "ETB",
      periodDays: cfg.periodDays,
    };
  }

  const stripePlan = getPlanDisplay(plan);
  return {
    provider,
    plan,
    amount: stripePlan.amount,
    amountMinor: stripePlan.amountCents,
    currency: "USD",
    periodDays: stripePlan.days,
  };
}

export function formatEtb(amount: number): string {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })} ETB`;
}

export { STRIPE_PLANS };
