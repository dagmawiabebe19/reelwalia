import { chartBucketLabel, type ChartBucket } from "@/lib/admin/analytics-range";
import type { TimeSeriesPoint } from "@/lib/admin/chart-buckets";
import { getTimeSeriesMax } from "@/lib/admin/chart-buckets";

export function AdminTimeSeriesChart({
  title,
  subtitle,
  bucket,
  rangeLabel,
  points,
}: {
  title: string;
  subtitle?: string;
  bucket: ChartBucket;
  rangeLabel: string;
  points: TimeSeriesPoint[];
}) {
  const max = getTimeSeriesMax(points);
  const detail =
    subtitle ??
    `${chartBucketLabel(bucket)} buckets · ${rangeLabel} (UTC). Empty buckets show 0.`;

  return (
    <div className="rw-admin-panel">
      <h2 className="font-display text-lg uppercase tracking-wide text-white">{title}</h2>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
      {!points.length ? (
        <p className="mt-4 text-sm text-zinc-500">No data in this range.</p>
      ) : (
        <div className="mt-6 flex h-44 items-end gap-1.5 overflow-x-auto pb-1">
          {points.map((point, index) => {
            const height = point.count === 0 ? 4 : Math.max(12, (point.count / max) * 100);
            return (
              <div
                key={`${point.label}-${index}`}
                className="flex min-w-[2.25rem] flex-1 flex-col items-center gap-2"
              >
                <span className="text-[10px] text-zinc-500">{point.count}</span>
                <div
                  className="w-full min-w-[1.25rem] rounded-t bg-obsidian-red/80"
                  style={{ height: `${height}%` }}
                  title={`${point.label}: ${point.count}`}
                />
                <span className="max-w-full truncate text-[9px] uppercase tracking-wide text-zinc-600">
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
