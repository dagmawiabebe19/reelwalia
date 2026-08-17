import { SalesDashboardView } from "@/components/admin/SalesDashboardView";
import { buildSalesDashboardData, type SubscriptionRow } from "@/lib/admin/sales-stats";
import { requireAdmin } from "@/lib/admin";
import {
  formatRangeFormInputs,
  parseAnalyticsRange,
  type DatePreset,
} from "@/lib/admin/analytics-range";
import { createAdminClient } from "@/lib/supabase/admin";

type SearchParams = {
  preset?: string;
  from?: string;
  to?: string;
};

export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const admin = createAdminClient();
  const range = parseAnalyticsRange(searchParams);
  const { from, to } = formatRangeFormInputs(range, searchParams);

  const { data: subscriptions, error } = await admin
    .from("subscriptions")
    .select("id, user_id, plan, status, created_at, current_period_end")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rw-admin-panel">
        <p className="text-sm text-red-300">Could not load subscriptions: {error.message}</p>
      </div>
    );
  }

  const dashboard = buildSalesDashboardData((subscriptions ?? []) as SubscriptionRow[], range);

  return (
    <SalesDashboardView
      data={dashboard}
      preset={range.preset as DatePreset}
      from={from}
      to={to}
    />
  );
}
