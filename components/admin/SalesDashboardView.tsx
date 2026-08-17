import { AdminPageHeader } from "@/components/admin/admin-ui";
import { AdminDateRangeForm } from "@/components/admin/AdminDateRangeForm";
import { AdminTimeSeriesChart } from "@/components/admin/AdminTimeSeriesChart";
import { formatPlanLabel, type SalesDashboardData } from "@/lib/admin/sales-stats";
import type { DatePreset } from "@/lib/admin/analytics-range";

function StatCard({
  label,
  value,
  meta,
}: {
  label: string;
  value: string | number;
  meta?: string;
}) {
  return (
    <div className="rw-admin-stat-card">
      <p className="rw-admin-stat-label">{label}</p>
      <p className="rw-admin-stat-value">{value}</p>
      {meta && <p className="rw-admin-stat-meta">{meta}</p>}
    </div>
  );
}

export function SalesDashboardView({
  data,
  preset,
  from,
  to,
}: {
  data: SalesDashboardData;
  preset: DatePreset;
  from: string;
  to: string;
}) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Sales"
        subtitle={`Subscription metrics · ${data.range.label} (UTC)`}
      />

      <AdminDateRangeForm preset={preset} from={from} to={to} />

      <div className="rw-admin-panel border-amber-500/20 bg-amber-500/[0.04]">
        <p className="text-sm text-amber-200/90">{data.revenueNote}</p>
      </div>

      <div className="rw-admin-stat-grid">
        <StatCard
          label="New subscriptions"
          value={data.totalInRange}
          meta={`Created in ${data.range.label.toLowerCase()}`}
        />
        <StatCard
          label="Active (from range)"
          value={data.activeInRange}
          meta="Created in range, still active or trialing"
        />
        <StatCard
          label="Top plan"
          value={data.topPlan ? formatPlanLabel(data.topPlan.plan) : "—"}
          meta={
            data.topPlan
              ? `${data.topPlan.count} active in range`
              : "No active plans in range"
          }
        />
        <StatCard label="Date range" value={data.range.label} meta="All cards use this window" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminTimeSeriesChart
          title="New subscriptions"
          bucket={data.chartBucket}
          rangeLabel={data.range.label}
          points={data.signupSeries}
        />

        <div className="rw-admin-panel">
          <h2 className="font-display text-lg uppercase tracking-wide text-white">
            Plan breakdown
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Active subscriptions created in {data.range.label.toLowerCase()}.
          </p>
          {!data.planBreakdown.length ? (
            <p className="mt-4 text-sm text-zinc-500">No active subscriptions in this range.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.planBreakdown.map((item) => {
                const total = data.activeInRange || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <li key={item.plan}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-zinc-300">{formatPlanLabel(item.plan)}</span>
                      <span className="text-zinc-500">
                        {item.count} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-obsidian-red"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
