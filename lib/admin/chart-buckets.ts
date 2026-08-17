import type { ChartBucket, DateRange } from "@/lib/admin/analytics-range";

export type TimeSeriesPoint = { label: string; count: number };

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeek(date: Date): Date {
  const day = startOfUtcDay(date);
  const weekday = day.getUTCDay();
  const diff = weekday === 0 ? 6 : weekday - 1;
  day.setUTCDate(day.getUTCDate() - diff);
  return day;
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addBucket(date: Date, bucket: ChartBucket): Date {
  const next = new Date(date);
  if (bucket === "day") {
    next.setUTCDate(next.getUTCDate() + 1);
  } else if (bucket === "week") {
    next.setUTCDate(next.getUTCDate() + 7);
  } else {
    next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return next;
}

function floorToBucket(date: Date, bucket: ChartBucket): Date {
  if (bucket === "day") return startOfUtcDay(date);
  if (bucket === "week") return startOfUtcWeek(date);
  return startOfUtcMonth(date);
}

function formatBucketLabel(start: Date, bucket: ChartBucket): string {
  if (bucket === "month") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }).format(start);
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(start);
}

function enumerateBucketStarts(range: DateRange, bucket: ChartBucket): Date[] {
  const starts: Date[] = [];
  let cursor = floorToBucket(range.from, bucket);
  const rangeEnd = range.to.getTime();

  while (cursor.getTime() < rangeEnd) {
    starts.push(new Date(cursor));
    cursor = addBucket(cursor, bucket);
  }

  return starts;
}

/** Build chart buckets for a date range. Empty buckets stay at 0 — never estimated. */
export function buildTimeSeriesBuckets(
  timestamps: Date[],
  range: DateRange,
  bucket: ChartBucket
): TimeSeriesPoint[] {
  const bucketStarts = enumerateBucketStarts(range, bucket);
  const counts = new Map<number, number>();
  for (const start of bucketStarts) {
    counts.set(start.getTime(), 0);
  }

  const rangeEnd = range.to.getTime();
  for (const ts of timestamps) {
    const time = ts.getTime();
    if (time < range.from.getTime() || time >= rangeEnd) continue;
    const start = floorToBucket(ts, bucket);
    const key = start.getTime();
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return bucketStarts.map((start) => ({
    label: formatBucketLabel(start, bucket),
    count: counts.get(start.getTime()) ?? 0,
  }));
}

export function getTimeSeriesMax(points: TimeSeriesPoint[]): number {
  return Math.max(...points.map((p) => p.count), 1);
}
