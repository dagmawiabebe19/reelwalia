"use client";

import { AdminPageHeader, AdminPanelHeading } from "@/components/admin/admin-ui";
import {
  formatCount,
  formatPercent,
  formatUsdCents,
  type DatePreset,
} from "@/lib/admin/analytics-range";
import type { SeriesAnalytics, SeriesOption } from "@/lib/admin/series-analytics";

function StatCard({
  label,
  value,
  meta,
  untracked,
}: {
  label: string;
  value: string;
  meta?: string;
  untracked?: boolean;
}) {
  return (
    <div className="rw-admin-stat-card">
      <p className="rw-admin-stat-label">{label}</p>
      <p className={`rw-admin-stat-value ${untracked ? "text-zinc-500" : ""}`}>{value}</p>
      {meta && <p className="rw-admin-stat-meta">{meta}</p>}
    </div>
  );
}

function FunnelBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 ? Math.max(4, (value / max) * 100) : 4;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="text-zinc-500">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-obsidian-red" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function AnalyticsDashboardView({
  seriesList,
  selectedId,
  preset,
  from,
  to,
  data,
}: {
  seriesList: SeriesOption[];
  selectedId: string | null;
  preset: DatePreset;
  from: string;
  to: string;
  data: SeriesAnalytics | null;
}) {
  const customFrom = from;
  const customTo = to;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Analytics"
        subtitle="Per-series performance for licensor reports. Metrics that are not in the database are labeled Not yet tracked — never estimated."
      />

      <form method="get" className="rw-admin-panel space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block space-y-1.5">
            <span className="rw-form-label">Series</span>
            <select
              name="seriesId"
              defaultValue={selectedId ?? ""}
              className="w-full rounded-lg border border-white/[0.12] bg-black px-3 py-2 text-sm text-white"
            >
              <option value="">Select a series…</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="rw-form-label">Date range</span>
            <select
              name="preset"
              defaultValue={preset}
              className="w-full rounded-lg border border-white/[0.12] bg-black px-3 py-2 text-sm text-white"
            >
              <option value="30d">Last 30 days</option>
              <option value="quarter">This quarter</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="rw-form-label">From (custom)</span>
            <input
              type="date"
              name="from"
              defaultValue={customFrom}
              className="w-full rounded-lg border border-white/[0.12] bg-black px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="rw-form-label">To (custom)</span>
            <input
              type="date"
              name="to"
              defaultValue={customTo}
              className="w-full rounded-lg border border-white/[0.12] bg-black px-3 py-2 text-sm text-white"
            />
          </label>
        </div>
        <button type="submit" className="rw-btn-primary">
          Apply
        </button>
      </form>

      {!selectedId && (
        <div className="rw-admin-panel">
          <p className="text-sm text-zinc-400">Choose a series to load its dashboard.</p>
        </div>
      )}

      {selectedId && !data && (
        <div className="rw-admin-panel">
          <p className="text-sm text-red-300">Series not found.</p>
        </div>
      )}

      {data && (
        <>
          {!data.tablesReady && (
            <div className="rw-admin-panel border-amber-500/20 bg-amber-500/[0.04]">
              <p className="text-sm text-amber-200/90">
                Migration <code>027_series_analytics_events.sql</code> is not applied on Platform
                yet. Drop-off uses authenticated watch_history. Play counts, paywall conversion, and
                cash revenue will appear after you apply it in the SQL editor.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl uppercase tracking-wide text-white">
                {data.series.title}
              </h2>
              <p className="text-xs text-zinc-500">{data.range.label} · UTC</p>
            </div>
            <a
              href={`/admin/analytics/report?seriesId=${encodeURIComponent(data.series.id)}&preset=${encodeURIComponent(data.range.preset)}&from=${encodeURIComponent(customFrom)}&to=${encodeURIComponent(customTo)}`}
              className="rw-btn-primary"
            >
              Download PDF report
            </a>
          </div>

          <div className="rw-admin-stat-grid">
            <StatCard
              label="Total views"
              value={formatCount(data.views.value)}
              meta={data.views.source}
              untracked={data.views.value == null}
            />
            <StatCard
              label="Unique viewers"
              value={formatCount(data.uniqueViewers.value)}
              meta={data.uniqueViewers.source}
              untracked={data.uniqueViewers.value == null}
            />
            <StatCard
              label="Full-series completion"
              value={formatPercent(data.fullSeriesCompletion.value)}
              meta={
                data.fullSeriesCompletion.completers != null
                  ? `${data.fullSeriesCompletion.completers} finished all episodes`
                  : data.fullSeriesCompletion.source
              }
              untracked={data.fullSeriesCompletion.value == null}
            />
            <StatCard
              label="Paywall conversion"
              value={formatPercent(data.paywallConversion.rate)}
              meta={data.paywallConversion.source}
              untracked={data.paywallConversion.rate == null}
            />
            <StatCard
              label="Net revenue"
              value={formatUsdCents(data.revenue.netCents)}
              meta={data.revenue.tracked ? "50% licensor share below" : "Not yet tracked"}
              untracked={!data.revenue.tracked}
            />
          </div>

          <div className="rw-admin-panel space-y-4">
            <AdminPanelHeading
              title="Episode drop-off"
              subtitle="Started vs finished. Event plays after 027; otherwise authenticated watch_history."
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-xs uppercase tracking-wide text-zinc-500">
                    <th className="py-2 pr-3 font-medium">Episode</th>
                    <th className="py-2 pr-3 font-medium">Started</th>
                    <th className="py-2 pr-3 font-medium">Finished</th>
                    <th className="py-2 pr-3 font-medium">Completion</th>
                    <th className="py-2 font-medium">Retention</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dropOff.map((ep) => {
                    const maxStart = Math.max(
                      ...data.dropOff.map((row) => row.started ?? 0),
                      1
                    );
                    const bar = ((ep.finished ?? 0) / maxStart) * 100;
                    return (
                      <tr key={ep.episodeId} className="border-b border-white/[0.04]">
                        <td className="py-2.5 pr-3 text-white">
                          {ep.episodeNumber}. {ep.title}
                        </td>
                        <td className="py-2.5 pr-3 text-zinc-300">{formatCount(ep.started)}</td>
                        <td className="py-2.5 pr-3 text-zinc-300">{formatCount(ep.finished)}</td>
                        <td className="py-2.5 pr-3 text-zinc-300">
                          {formatPercent(ep.completionRate)}
                        </td>
                        <td className="py-2.5">
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-obsidian-red/80"
                              style={{ width: `${Math.max(ep.started ? bar : 0, 0)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rw-admin-panel space-y-4">
              <AdminPanelHeading
                title="Paywall funnel"
                subtitle="Reached paywall → purchased. Requires episode_events."
              />
              {data.paywallConversion.reached == null ? (
                <p className="text-sm text-zinc-500">Not yet tracked.</p>
              ) : (
                <div className="space-y-4">
                  <FunnelBar
                    label="Reached paywall"
                    value={data.paywallConversion.reached}
                    max={Math.max(data.paywallConversion.reached, 1)}
                  />
                  <FunnelBar
                    label="Purchased"
                    value={data.paywallConversion.purchased ?? 0}
                    max={Math.max(data.paywallConversion.reached, 1)}
                  />
                  <p className="text-xs text-zinc-500">{data.paywallConversion.note}</p>
                </div>
              )}
            </div>

            <div className="rw-admin-panel space-y-3">
              <AdminPanelHeading
                title="Net Revenue"
                subtitle="Licensing agreement format — this series only."
              />
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4 text-zinc-300">
                  <dt>Gross (direct)</dt>
                  <dd>{formatUsdCents(data.revenue.directCents)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-zinc-300">
                  <dt>Gross (pro-rata)</dt>
                  <dd>{formatUsdCents(data.revenue.prorataCents)}</dd>
                </div>
                <div className="flex justify-between gap-4 font-medium text-white">
                  <dt>Gross</dt>
                  <dd>{formatUsdCents(data.revenue.grossCents)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-zinc-400">
                  <dt>Processing fees</dt>
                  <dd>− {formatUsdCents(data.revenue.processingFeeCents)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-zinc-400">
                  <dt>Refunds</dt>
                  <dd>− {formatUsdCents(data.revenue.refundsCents)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-zinc-400">
                  <dt>Taxes</dt>
                  <dd>− {formatUsdCents(data.revenue.taxCents)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-zinc-400">
                  <dt>App-store cuts</dt>
                  <dd>− {formatUsdCents(data.revenue.appStoreCents)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-zinc-400">
                  <dt>Delivery</dt>
                  <dd>
                    {data.revenue.deliveryTracked
                      ? `− ${formatUsdCents(data.revenue.deliveryCents)}`
                      : "Not yet tracked"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-white/[0.08] pt-2 font-semibold text-white">
                  <dt>Net Revenue</dt>
                  <dd>{formatUsdCents(data.revenue.netCents)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-obsidian-red">
                  <dt>Licensor share (50%)</dt>
                  <dd>{formatUsdCents(data.revenue.licensorShareCents)}</dd>
                </div>
              </dl>
              <p className="text-xs text-zinc-500">{data.revenue.note}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
