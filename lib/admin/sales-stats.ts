import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";
import {
  chartBucketForRange,
  type DateRange,
  type ChartBucket,
} from "@/lib/admin/analytics-range";
import { buildTimeSeriesBuckets, type TimeSeriesPoint } from "@/lib/admin/chart-buckets";

export type SubscriptionRow = {
  id: string;
  user_id: string;
  plan: SubscriptionPlan | string;
  status: SubscriptionStatus | string;
  created_at: string;
  current_period_end: string | null;
};

export type SalesDashboardData = {
  range: DateRange;
  chartBucket: ChartBucket;
  totalInRange: number;
  activeInRange: number;
  topPlan: { plan: string; count: number } | null;
  planBreakdown: { plan: string; count: number }[];
  signupSeries: TimeSeriesPoint[];
  revenueNote: string;
};

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

function inRange(createdAt: string, range: DateRange): boolean {
  const created = new Date(createdAt);
  return created >= range.from && created < range.to;
}

export function buildSalesDashboardData(
  rows: SubscriptionRow[],
  range: DateRange
): SalesDashboardData {
  const inRangeRows = rows.filter((row) => inRange(row.created_at, range));
  const activeInRange = inRangeRows.filter((row) => ACTIVE_STATUSES.has(row.status)).length;

  const planCounts = new Map<string, number>();
  for (const row of inRangeRows) {
    if (!ACTIVE_STATUSES.has(row.status)) continue;
    const plan = row.plan || "unknown";
    planCounts.set(plan, (planCounts.get(plan) ?? 0) + 1);
  }

  const planBreakdown = Array.from(planCounts.entries())
    .map(([plan, count]) => ({ plan, count }))
    .sort((a, b) => b.count - a.count);

  const chartBucket = chartBucketForRange(range);
  const signupSeries = buildTimeSeriesBuckets(
    inRangeRows.map((row) => new Date(row.created_at)),
    range,
    chartBucket
  );

  return {
    range,
    chartBucket,
    totalInRange: inRangeRows.length,
    activeInRange,
    topPlan: planBreakdown[0] ?? null,
    planBreakdown,
    signupSeries,
    revenueNote:
      "Payment amounts are not stored in Supabase. Counts below are subscriptions created in the selected date range only.",
  };
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
