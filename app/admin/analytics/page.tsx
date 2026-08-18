import { AnalyticsDashboardView } from "@/components/admin/AnalyticsDashboardView";
import { requireAdmin } from "@/lib/admin";
import { formatRangeFormInputs, parseAnalyticsRange, type DatePreset } from "@/lib/admin/analytics-range";
import {
  ALL_SERIES_ANALYTICS_ID,
  isAllSeriesAnalytics,
  listAnalyticsSeries,
  loadAllSeriesAnalytics,
  loadSeriesAnalytics,
} from "@/lib/admin/series-analytics";
import { parseTrafficSourceFilter } from "@/lib/traffic-source";

type SearchParams = {
  seriesId?: string;
  preset?: string;
  from?: string;
  to?: string;
  source?: string;
};

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();

  const seriesList = await listAnalyticsSeries();
  const selectedId = searchParams.seriesId ?? ALL_SERIES_ANALYTICS_ID;
  const range = parseAnalyticsRange({
    preset: searchParams.preset,
    from: searchParams.from,
    to: searchParams.to,
  });
  const sourceFilter = parseTrafficSourceFilter(searchParams.source);

  const data = isAllSeriesAnalytics(selectedId)
    ? await loadAllSeriesAnalytics(range, { sourceFilter })
    : await loadSeriesAnalytics(selectedId, range, { sourceFilter });

  const fromInput = formatRangeFormInputs(range, searchParams).from;
  const toInput = formatRangeFormInputs(range, searchParams).to;

  return (
    <AnalyticsDashboardView
      seriesList={seriesList}
      selectedId={selectedId}
      preset={range.preset as DatePreset}
      from={fromInput}
      to={toInput}
      sourceFilter={sourceFilter}
      data={data}
    />
  );
}
