import { AnalyticsDashboardView } from "@/components/admin/AnalyticsDashboardView";
import { requireAdmin } from "@/lib/admin";
import { formatRangeFormInputs, parseAnalyticsRange, type DatePreset } from "@/lib/admin/analytics-range";
import { listAnalyticsSeries, loadSeriesAnalytics } from "@/lib/admin/series-analytics";

type SearchParams = {
  seriesId?: string;
  preset?: string;
  from?: string;
  to?: string;
};

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();

  const seriesList = await listAnalyticsSeries();
  const selectedId = searchParams.seriesId || seriesList[0]?.id || null;
  const range = parseAnalyticsRange({
    preset: searchParams.preset,
    from: searchParams.from,
    to: searchParams.to,
  });

  const data = selectedId ? await loadSeriesAnalytics(selectedId, range) : null;

  const fromInput = formatRangeFormInputs(range, searchParams).from;
  const toInput = formatRangeFormInputs(range, searchParams).to;

  return (
    <AnalyticsDashboardView
      seriesList={seriesList}
      selectedId={selectedId}
      preset={range.preset as DatePreset}
      from={fromInput}
      to={toInput}
      data={data}
    />
  );
}
