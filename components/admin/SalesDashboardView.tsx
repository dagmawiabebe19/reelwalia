import { AdminPageHeader } from "@/components/admin/admin-ui";
import {
  formatPlanLabel,
  getWeeklySignupMax,
  type SalesDashboardData,
} from "@/lib/admin/sales-stats";

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

function WeeklySignupChart({ data }: { data: SalesDashboardData }) {
  const max = getWeeklySignupMax(data);

  return (
    <div className="rw-admin-panel">
      <h2 className="font-display text-lg uppercase tracking-wide text-white">
        New Subscriptions
      </h2>
      <p className="mt-1 text-xs text-zinc-500">Weekly signups over the last 12 weeks (UTC).</p>
      <div className="mt-6 flex h-44 items-end gap-2">
        {data.weeklySignups.map((week) => {
          const height = week.count === 0 ? 4 : Math.max(12, (week.count / max) * 100);
          return (
            <div key={week.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="text-[10px] text-zinc-500">{week.count}</span>
              <div
                className="w-full rounded-t bg-obsidian-red/80"
                style={{ height: `${height}%` }}
                title={`${week.label}: ${week.count}`}
              />
              <span className="truncate text-[9px] uppercase tracking-wide text-zinc-600">
                {week.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SalesDashboardView({ data }: { data: SalesDashboardData }) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Sales"
        subtitle="Subscription metrics from your Supabase subscriptions table."
      />

      <div className="rw-admin-panel border-amber-500/20 bg-amber-500/[0.04]">
        <p className="text-sm text-amber-200/90">{data.revenueNote}</p>
      </div>

      <div className="rw-admin-stat-grid">
        <StatCard
          label="Total Records"
          value={data.totalSubscriptions}
          meta="All subscription rows"
        />
        <StatCard
          label="Active"
          value={data.activeSubscriptions}
          meta="Status active or trialing"
        />
        <StatCard
          label="New (30d)"
          value={data.newLast30Days}
          meta="Created in last 30 days"
        />
        <StatCard
          label="Top Plan"
          value={data.topPlan ? formatPlanLabel(data.topPlan.plan) : "—"}
          meta={
            data.topPlan ? `${data.topPlan.count} active subscriber(s)` : "No active plans yet"
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <WeeklySignupChart data={data} />

        <div className="rw-admin-panel">
          <h2 className="font-display text-lg uppercase tracking-wide text-white">
            Plan Breakdown
          </h2>
          <p className="mt-1 text-xs text-zinc-500">Active subscriptions by plan.</p>
          {!data.planBreakdown.length ? (
            <p className="mt-4 text-sm text-zinc-500">No active subscriptions yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.planBreakdown.map((item) => {
                const total = data.activeSubscriptions || 1;
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
