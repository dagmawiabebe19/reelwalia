import { SalesDashboardView } from "@/components/admin/SalesDashboardView";
import { buildSalesDashboardData, type SubscriptionRow } from "@/lib/admin/sales-stats";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminSalesPage() {
  await requireAdmin();
  const admin = createAdminClient();

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

  const dashboard = buildSalesDashboardData((subscriptions ?? []) as SubscriptionRow[]);

  return <SalesDashboardView data={dashboard} />;
}
