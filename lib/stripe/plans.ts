export type StripePlanKey = "1week" | "2week" | "1month";

export interface PlanDisplay {
  key: StripePlanKey;
  /** Source of truth for display AND expected Stripe charge (USD cents). */
  amountCents: number;
  /** Recurring subscription price (USD) — always amountCents / 100. */
  amount: number;
  /** Billing period length in days (for per-day math). */
  days: number;
  /** e.g. "/week", "/2 weeks", "/month" */
  priceSuffix: string;
  renewalLabel: string;
  periodLabel: string;
  /** Env var holding the Stripe Price ID used at checkout and renewal. */
  priceEnvKey: string;
  /** Stripe recurring interval that must match the Price object. */
  stripeInterval: "week" | "month";
  stripeIntervalCount: number;
  mostPopular?: boolean;
}

type PlanConfig = Omit<PlanDisplay, "amount">;

const PLAN_CONFIG: PlanConfig[] = [
  {
    key: "1week",
    amountCents: 100,
    days: 7,
    priceSuffix: "/week",
    renewalLabel: "Renews weekly",
    periodLabel: "week",
    priceEnvKey: "STRIPE_PRICE_1WEEK_INTRO",
    stripeInterval: "week",
    stripeIntervalCount: 1,
  },
  {
    key: "2week",
    amountCents: 175,
    days: 14,
    priceSuffix: "/2 weeks",
    renewalLabel: "Renews every 2 weeks",
    periodLabel: "2 weeks",
    priceEnvKey: "STRIPE_PRICE_2WEEK_INTRO",
    stripeInterval: "week",
    stripeIntervalCount: 2,
  },
  {
    key: "1month",
    amountCents: 400,
    days: 30,
    priceSuffix: "/month",
    renewalLabel: "Renews monthly",
    periodLabel: "month",
    priceEnvKey: "STRIPE_PRICE_1MONTH_INTRO",
    stripeInterval: "month",
    stripeIntervalCount: 1,
    mostPopular: true,
  },
];

/**
 * Single source of truth: display amount, per-day math, and expected Stripe
 * charge all come from amountCents. Checkout looks up priceEnvKey and refuses
 * to charge if the Stripe Price unit_amount does not match.
 */
export const STRIPE_PLANS: PlanDisplay[] = PLAN_CONFIG.map((plan) => ({
  ...plan,
  amount: plan.amountCents / 100,
}));

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

/** e.g. "$0.14/day" — uses the listed Stripe amount, never a made-up price. */
export function formatDailyPrice(plan: PlanDisplay): string {
  return `$${dailyRate(plan.amount, plan.days).toFixed(2)}/day`;
}

export function formatPeriodPrice(plan: PlanDisplay): string {
  return `${formatUsd(plan.amount)} ${plan.priceSuffix.replace(/^\//, "/ ")}`;
}

/** Hide badges that are too small to be a meaningful reason to pick a plan. */
const MIN_SAVINGS_BADGE_PERCENT = 15;

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
  if (rounded < MIN_SAVINGS_BADGE_PERCENT) return null;
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
