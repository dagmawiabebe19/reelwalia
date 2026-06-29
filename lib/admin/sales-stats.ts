import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";

export type SubscriptionRow = {
  id: string;
  user_id: string;
  plan: SubscriptionPlan | string;
  status: SubscriptionStatus | string;
  created_at: string;
  current_period_end: string | null;
};

export type SalesDashboardData = {
  totalSubscriptions: number;
  activeSubscriptions: number;
  newLast30Days: number;
  topPlan: { plan: string; count: number } | null;
  planBreakdown: { plan: string; count: number }[];
  weeklySignups: { label: string; count: number }[];
  revenueNote: string;
};

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatWeekLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function buildSalesDashboardData(rows: SubscriptionRow[]): SalesDashboardData {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const activeSubscriptions = rows.filter((row) => ACTIVE_STATUSES.has(row.status)).length;
  const newLast30Days = rows.filter((row) => new Date(row.created_at) >= thirtyDaysAgo).length;

  const planCounts = new Map<string, number>();
  for (const row of rows) {
    if (!ACTIVE_STATUSES.has(row.status)) continue;
    const plan = row.plan || "unknown";
    planCounts.set(plan, (planCounts.get(plan) ?? 0) + 1);
  }

  const planBreakdown = Array.from(planCounts.entries())
    .map(([plan, count]) => ({ plan, count }))
    .sort((a, b) => b.count - a.count);

  const topPlan = planBreakdown[0] ?? null;

  const weeks = 12;
  const weeklySignups: { label: string; count: number }[] = [];
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const weekStart = startOfUtcDay(now);
    weekStart.setUTCDate(weekStart.getUTCDate() - index * 7);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const count = rows.filter((row) => {
      const created = new Date(row.created_at);
      return created >= weekStart && created < weekEnd;
    }).length;
    weeklySignups.push({ label: formatWeekLabel(weekStart), count });
  }

  return {
    totalSubscriptions: rows.length,
    activeSubscriptions,
    newLast30Days,
    topPlan,
    planBreakdown,
    weeklySignups: weeklySignups.map((item) => ({
      ...item,
      count: item.count,
    })),
    revenueNote:
      "Payment amounts are not stored in Supabase. Counts below come from the subscriptions table only.",
  };
}

export function getWeeklySignupMax(data: SalesDashboardData): number {
  return Math.max(...data.weeklySignups.map((item) => item.count), 1);
}

export function formatPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    free: "Free",
    monthly: "Monthly",
    yearly: "Yearly",
    "1week": "1 Week",
    "2week": "2 Week",
    "1month": "1 Month",
  };
  return labels[plan] ?? plan.replace(/_/g, " ");
}
