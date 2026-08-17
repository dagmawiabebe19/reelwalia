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

/** e.g. "$0.57/day" — uses the listed Stripe amount, never a made-up price. */
export function formatDailyPrice(plan: PlanDisplay): string {
  return `$${dailyRate(plan.amount, plan.days).toFixed(2)}/day`;
}

export function formatPeriodPrice(plan: PlanDisplay): string {
  return `${formatUsd(plan.amount)} ${plan.priceSuffix.replace(/^\//, "/ ")}`;
}

/**
 * Per-day savings vs the 1-week plan, using displayed (2-decimal) daily rates
 * so the badge matches what the user sees. Null when there is no honest savings.
 */
export function dailySavingsPercentVsWeekly(plan: PlanDisplay): number | null {
  if (plan.key === BASELINE_PLAN_KEY) return null;

  const baseline = getPlanDisplay(BASELINE_PLAN_KEY);
  const baseDaily = Number(dailyRate(baseline.amount, baseline.days).toFixed(2));
  const daily = Number(dailyRate(plan.amount, plan.days).toFixed(2));
  if (baseDaily <= 0 || daily >= baseDaily) return null;

  const exact = ((baseDaily - daily) / baseDaily) * 100;
  const rounded = Math.round(exact);
  if (rounded <= 0) return null;
  // Drop if rounding would stretch the truth (e.g. 12.4% → 12 is fine; 12.6% → 13 is fine).
  if (Math.abs(exact - rounded) > 0.5) return null;
  return rounded;
}

/** Honest per-day comparison to weekly — never a fake list-price discount. */
export function savingsBadge(plan: PlanDisplay): string | null {
  const pct = dailySavingsPercentVsWeekly(plan);
  if (pct == null) return null;
  return `${pct}% less per day than weekly`;
}

export function mapPlanToDbPlan(plan: StripePlanKey): string {
  return plan;
}
