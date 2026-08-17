"use client";

import { AdminPageHeader, AdminPanelHeading } from "@/components/admin/admin-ui";
import { AdminDateRangeForm } from "@/components/admin/AdminDateRangeForm";
import {
  formatCount,
  formatPercent,
  formatUsdCents,
  type DatePreset,
} from "@/lib/admin/analytics-range";
import type { SeriesAnalytics, SeriesOption } from "@/lib/admin/series-analytics";
import {
  TRAFFIC_SOURCE_ATTRIBUTION_START,
  TRAFFIC_SOURCE_LABELS,
  type TrafficSourceFilter,
} from "@/lib/traffic-source";

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
  sourceFilter,
  data,
}: {
  seriesList: SeriesOption[];
  selectedId: string | null;
  preset: DatePreset;
  from: string;
  to: string;
  sourceFilter: TrafficSourceFilter;
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

      <AdminDateRangeForm preset={preset} from={from} to={to} sourceFilter={sourceFilter}>
        <label className="block space-y-1.5 md:col-span-2 xl:col-span-1">
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
      </AdminDateRangeForm>

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
          <div className="rw-admin-panel border-sky-500/20 bg-sky-500/[0.04]">
            <p className="text-sm text-sky-100/90">
              Traffic source attribution (ad vs organic) starts from{" "}
              <strong>{TRAFFIC_SOURCE_ATTRIBUTION_START}</strong>. Events before that date, or
              before migration <code>029_traffic_source.sql</code> is applied, have no source and
              appear as <strong>unknown</strong> — never guessed. Use the Traffic source filter to
              isolate ad-campaign conversion.
            </p>
          </div>

          {!data.trafficSourceReady && data.tablesReady && (
            <div className="rw-admin-panel border-amber-500/20 bg-amber-500/[0.04]">
              <p className="text-sm text-amber-200/90">
                Migration <code>029_traffic_source.sql</code> is not applied on Platform yet.
                Source filtering and per-event attribution stay unavailable until you run it in the
                SQL editor.
              </p>
            </div>
          )}

          {!data.tablesReady && (
            <div className="rw-admin-panel border-amber-500/20 bg-amber-500/[0.04]">
              <p className="text-sm text-amber-200/90">
                Migration <code>027_series_analytics_events.sql</code> is not applied on Platform
                yet. Drop-off uses authenticated watch_history. Play counts, paywall conversion, and
                cash revenue will appear after you apply it in the SQL editor.
              </p>
            </div>
          )}
          {data.tablesReady && !data.paywallAb.tracked && (
            <div className="rw-admin-panel border-amber-500/20 bg-amber-500/[0.04]">
              <p className="text-sm text-amber-200/90">
                Migration <code>028_paywall_ab_variant.sql</code> is not applied yet. Paywall A/B
                assignment and per-variant results stay Not yet tracked until you run it in the SQL
                editor.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl uppercase tracking-wide text-white">
                {data.series.title}
              </h2>
              <p className="text-xs text-zinc-500">
                {data.range.label} · UTC
                {data.sourceFilter !== "all"
                  ? ` · ${TRAFFIC_SOURCE_LABELS[data.sourceFilter === "ad" ? "ad" : "organic"]} only`
                  : ""}
              </p>
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
              label="Unique viewers (signed-in)"
              value={formatCount(data.uniqueViewers.value)}
              meta={data.uniqueViewers.note}
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
              title="Paywall position A/B"
              subtitle="Group A = wall after episode 1. Group B = wall after episode 2 (current default). Platform-wide for the selected date range."
            />
            <p className="text-sm text-amber-200/80">
              Conversion rate is misleading here: Group A sees the wall sooner, so a higher
              percentage will convert even if it produces fewer paying subscribers. Decide with
              total subscribers and subscribers per user.
            </p>
            {!data.paywallAb.tracked ? (
              <p className="text-sm text-zinc-500">{data.paywallAb.note}</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-xs uppercase tracking-wide text-zinc-500">
                        <th className="py-2 pr-3 font-medium">Group</th>
                        <th className="py-2 pr-3 font-medium">Users</th>
                        <th className="py-2 pr-3 font-medium">Reached paywall</th>
                        <th className="py-2 pr-3 font-medium">Subscribers</th>
                        <th className="py-2 pr-3 font-medium">Conv. rate</th>
                        <th className="py-2 font-medium">Subs per user</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.paywallAb.arms.map((arm) => (
                        <tr key={arm.variant} className="border-b border-white/[0.04]">
                          <td className="py-2.5 pr-3 text-white">{arm.label}</td>
                          <td className="py-2.5 pr-3 text-zinc-300">{formatCount(arm.users)}</td>
                          <td className="py-2.5 pr-3 text-zinc-300">
                            {formatCount(arm.paywallReached)}
                          </td>
                          <td className="py-2.5 pr-3 font-medium text-white">
                            {formatCount(arm.purchased)}
                          </td>
                          <td className="py-2.5 pr-3 text-zinc-500">
                            {formatPercent(arm.conversionRate)}
                          </td>
                          <td className="py-2.5 font-medium text-obsidian-red">
                            {arm.subsPerUser == null
                              ? "Not yet tracked"
                              : arm.subsPerUser.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(() => {
                  const a = data.paywallAb.arms[0]?.purchased;
                  const b = data.paywallAb.arms[1]?.purchased;
                  if (a == null || b == null) return null;
                  const lead =
                    a === b
                      ? "Tied on total subscribers in this range."
                      : a > b
                        ? `Group A produced ${a - b} more subscriber${a - b === 1 ? "" : "s"} in this range.`
                        : `Group B produced ${b - a} more subscriber${b - a === 1 ? "" : "s"} in this range.`;
                  return <p className="text-sm text-zinc-300">{lead}</p>;
                })()}
                <p className="text-xs text-zinc-500">{data.paywallAb.note}</p>
              </>
            )}
          </div>

          <div className="rw-admin-panel space-y-4">
            <AdminPanelHeading
              title="Episode drop-off"
              subtitle="Distinct viewers per episode. Finished = episode_events + watch_history (deduped). Not yet tracked when no completion data exists."
            />
            {data.historyCompletionsRecovered != null && data.historyCompletionsRecovered > 0 && (
              <p className="text-sm text-zinc-400">
                Recovered {data.historyCompletionsRecovered.toLocaleString()} historical completion
                {data.historyCompletionsRecovered === 1 ? "" : "s"} from watch_history that were
                missing in episode_events.
              </p>
            )}
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
