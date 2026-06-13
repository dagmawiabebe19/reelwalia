export type StripePlanKey = "1week" | "2week" | "1month";

export interface PlanDisplay {
  key: StripePlanKey;
  label: string;
  periodLabel: string;
  introAmount: number;
  standardAmount: number;
  days: number;
  mostPopular?: boolean;
}

export const STRIPE_PLANS: PlanDisplay[] = [
  {
    key: "1week",
    label: "1-WEEK",
    periodLabel: "week",
    introAmount: 3.99,
    standardAmount: 9.99,
    days: 7,
  },
  {
    key: "2week",
    label: "2-WEEK",
    periodLabel: "2 weeks",
    introAmount: 4.24,
    standardAmount: 14.99,
    days: 14,
    mostPopular: true,
  },
  {
    key: "1month",
    label: "1-MONTH",
    periodLabel: "month",
    introAmount: 7.49,
    standardAmount: 19.99,
    days: 30,
  },
];

export function getPlanDisplay(key: StripePlanKey): PlanDisplay {
  const plan = STRIPE_PLANS.find((p) => p.key === key);
  if (!plan) throw new Error(`Unknown plan: ${key}`);
  return plan;
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function savePercent(intro: number, standard: number): number {
  return Math.round(((standard - intro) / standard) * 100);
}

export function dailyPrice(intro: number, days: number): string {
  return `$${(intro / days).toFixed(2)} per day`;
}

export function mapPlanToDbPlan(plan: StripePlanKey): string {
  return plan;
}
