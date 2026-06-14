export type StripePlanKey = "1week" | "2week" | "1month";

export interface PlanDisplay {
  key: StripePlanKey;
  label: string;
  /** Recurring subscription price (USD). */
  amount: number;
  /** Billing period length in days (for per-day math). */
  days: number;
  /** e.g. "/week", "/2 weeks", "/month" */
  priceSuffix: string;
  renewalLabel: string;
  periodLabel: string;
  mostPopular?: boolean;
}

export const STRIPE_PLANS: PlanDisplay[] = [
  {
    key: "1week",
    label: "1-WEEK",
    amount: 3.99,
    days: 7,
    priceSuffix: "/week",
    renewalLabel: "Renews weekly",
    periodLabel: "week",
  },
  {
    key: "2week",
    label: "2-WEEK",
    amount: 4.24,
    days: 14,
    priceSuffix: "/2 weeks",
    renewalLabel: "Renews every 2 weeks",
    periodLabel: "2 weeks",
  },
  {
    key: "1month",
    label: "1-MONTH",
    amount: 7.49,
    days: 30,
    priceSuffix: "/month",
    renewalLabel: "Renews monthly",
    periodLabel: "month",
    mostPopular: true,
  },
];

const BASELINE_PLAN_KEY: StripePlanKey = "1week";

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

/** e.g. "Only $0.57/day" */
export function formatDailyPrice(plan: PlanDisplay): string {
  return `Only $${dailyRate(plan.amount, plan.days).toFixed(2)}/day`;
}

/** Daily-cost savings vs the 1-week plan — honest comparison, not a fake list price. */
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
