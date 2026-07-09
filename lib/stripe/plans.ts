export type StripePlanKey = "1week" | "1month";

export interface PlanDisplay {
  key: StripePlanKey;
  label: string;
  /** Recurring subscription price (USD). */
  amount: number;
  /** Billing period length in days (for per-day math). */
  days: number;
  /** e.g. "/week", "/month" */
  priceSuffix: string;
  renewalLabel: string;
  periodLabel: string;
  mostPopular?: boolean;
}

/**
 * "All shows" subscription tiers (secondary offer / upsell).
 * The primary offer is the one-time per-series unlock — see lib/paywall-config.ts.
 */
export const STRIPE_PLANS: PlanDisplay[] = [
  {
    key: "1week",
    label: "Weekly",
    amount: 2.99,
    days: 7,
    priceSuffix: "/week",
    renewalLabel: "Renews weekly",
    periodLabel: "week",
  },
  {
    key: "1month",
    label: "Monthly",
    amount: 5.99,
    days: 30,
    priceSuffix: "/month",
    renewalLabel: "Renews monthly",
    periodLabel: "month",
    mostPopular: true,
  },
];

const BASELINE_PLAN_KEY: StripePlanKey = "1week";

export function isStripePlanKey(value: unknown): value is StripePlanKey {
  return value === "1week" || value === "1month";
}

export function getPlanDisplay(key: StripePlanKey): PlanDisplay {
  const plan = STRIPE_PLANS.find((p) => p.key === key);
  if (!plan) throw new Error(`Unknown plan: ${key}`);
  return plan;
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatPlanPrice(plan: PlanDisplay): string {
  return `${formatUsd(plan.amount)}${plan.priceSuffix}`;
}

export function dailyRate(amount: number, days: number): number {
  return amount / days;
}

/** e.g. "Only $0.20/day" */
export function formatDailyPrice(plan: PlanDisplay): string {
  return `Only $${dailyRate(plan.amount, plan.days).toFixed(2)}/day`;
}

/** Daily-cost savings vs the weekly plan — honest comparison, not a fake list price. */
export function savingsBadge(plan: PlanDisplay): string | null {
  if (plan.key === BASELINE_PLAN_KEY) return null;

  const baseline = getPlanDisplay(BASELINE_PLAN_KEY);
  const baseDaily = dailyRate(baseline.amount, baseline.days);
  const daily = dailyRate(plan.amount, plan.days);
  const pct = Math.round(((baseDaily - daily) / baseDaily) * 100);

  if (pct <= 0) return null;
  return `SAVE ${pct}%`;
}

export function mapPlanToDbPlan(plan: StripePlanKey): string {
  return plan;
}
