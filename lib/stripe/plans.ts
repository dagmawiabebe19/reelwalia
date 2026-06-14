export type StripePlanKey = "1week" | "2week" | "1month";

export interface PlanDisplay {
  key: StripePlanKey;
  label: string;
  /** Recurring subscription price (USD). */
  amount: number;
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
    priceSuffix: "/week",
    renewalLabel: "Renews weekly",
    periodLabel: "week",
  },
  {
    key: "2week",
    label: "2-WEEK",
    amount: 4.24,
    priceSuffix: "/2 weeks",
    renewalLabel: "Renews every 2 weeks",
    periodLabel: "2 weeks",
    mostPopular: true,
  },
  {
    key: "1month",
    label: "1-MONTH",
    amount: 7.49,
    priceSuffix: "/month",
    renewalLabel: "Renews monthly",
    periodLabel: "month",
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

export function formatPlanPrice(plan: PlanDisplay): string {
  return `${formatUsd(plan.amount)}${plan.priceSuffix}`;
}

export function mapPlanToDbPlan(plan: StripePlanKey): string {
  return plan;
}
