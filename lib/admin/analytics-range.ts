export type DatePreset =
  | "today"
  | "2d"
  | "7d"
  | "30d"
  | "quarter"
  | "12m"
  | "custom";

export type DateRange = {
  from: Date;
  to: Date;
  preset: DatePreset;
  label: string;
};

export type ChartBucket = "day" | "week" | "month";

export const ADMIN_DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "2d", label: "Last 2 days" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "quarter", label: "This quarter" },
  { value: "12m", label: "Last 12 months" },
  { value: "custom", label: "Custom" },
];

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function currentUtcQuarter(now = new Date()): { from: Date; to: Date; label: string } {
  const year = now.getUTCFullYear();
  const quarter = Math.floor(now.getUTCMonth() / 3);
  const from = new Date(Date.UTC(year, quarter * 3, 1));
  const to = new Date(Date.UTC(year, quarter * 3 + 3, 1));
  return { from, to, label: `Q${quarter + 1} ${year}` };
}

function isValidPreset(value: string | null | undefined): value is DatePreset {
  return ADMIN_DATE_PRESETS.some((p) => p.value === value);
}

export function parseAnalyticsRange(params: {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
  now?: Date;
}): DateRange {
  const now = params.now ?? new Date();
  const preset = isValidPreset(params.preset) ? params.preset : "30d";

  if (preset === "custom" && params.from && params.to) {
    const from = startOfUtcDay(new Date(`${params.from}T00:00:00.000Z`));
    const toExclusive = startOfUtcDay(new Date(`${params.to}T00:00:00.000Z`));
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(toExclusive.getTime()) && from < toExclusive) {
      return {
        from,
        to: toExclusive,
        preset: "custom",
        label: `${params.from} → ${params.to}`,
      };
    }
  }

  if (preset === "today") {
    return {
      from: startOfUtcDay(now),
      to: now,
      preset: "today",
      label: "Today",
    };
  }

  if (preset === "2d") {
    return {
      from: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      to: now,
      preset: "2d",
      label: "Last 2 days",
    };
  }

  if (preset === "7d") {
    return {
      from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      to: now,
      preset: "7d",
      label: "Last 7 days",
    };
  }

  if (preset === "quarter") {
    const q = currentUtcQuarter(now);
    return { from: q.from, to: q.to, preset: "quarter", label: q.label };
  }

  if (preset === "12m") {
    const from = startOfUtcMonth(now);
    from.setUTCMonth(from.getUTCMonth() - 11);
    return {
      from,
      to: now,
      preset: "12m",
      label: "Last 12 months",
    };
  }

  // Default: last 30 days (preset "30d" or invalid custom fallback)
  return {
    from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    to: now,
    preset: "30d",
    label: "Last 30 days",
  };
}

/** Inclusive calendar dates for custom range form inputs. */
export function formatRangeFormInputs(
  range: DateRange,
  params?: { from?: string | null; to?: string | null }
): { from: string; to: string } {
  const from = params?.from ?? range.from.toISOString().slice(0, 10);
  const toInclusive = new Date(range.to.getTime() - 1);
  const to = params?.to ?? toInclusive.toISOString().slice(0, 10);
  return { from, to };
}

export function chartBucketForRange(range: DateRange): ChartBucket {
  if (range.preset === "today" || range.preset === "2d" || range.preset === "7d") {
    return "day";
  }
  if (range.preset === "30d" || range.preset === "quarter") {
    return "week";
  }
  if (range.preset === "12m") {
    return "month";
  }

  const days = (range.to.getTime() - range.from.getTime()) / (24 * 60 * 60 * 1000);
  if (days <= 8) return "day";
  if (days <= 95) return "week";
  return "month";
}

export function chartBucketLabel(bucket: ChartBucket): string {
  switch (bucket) {
    case "day":
      return "Daily";
    case "week":
      return "Weekly";
    case "month":
      return "Monthly";
  }
}

export function formatUsdCents(cents: number | null): string {
  if (cents == null) return "Not yet tracked";
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(value: number | null): string {
  if (value == null) return "Not yet tracked";
  return `${value.toFixed(1)}%`;
}

export function formatCount(value: number | null): string {
  if (value == null) return "Not yet tracked";
  return value.toLocaleString("en-US");
}

export const LICENSOR_SHARE = 0.5;

export const ANALYTICS_METRIC_NOTES = {
  views:
    "Play starts from episode_events. Not yet tracked until migration 027 is applied and viewers watch.",
  uniqueViewers:
    "Distinct signed-in users only. Guests are counted in Total views but cannot be deduplicated.",
  completion:
    "Per signed-in user: episode_events.complete when present, else watch_history.completed. Deduplicated — never double-counted.",
  dropOff:
    "Distinct viewers per episode (signed-in user or guest visitor_id). Finished merges episode_events + watch_history; shows Not yet tracked when no completion source exists.",
  paywall:
    "Requires episode_events.paywall_hit and purchase (migration 027 + live traffic).",
  revenue:
    "Requires billing_events from Stripe webhooks (migration 027). Amounts were not stored historically.",
  trafficSource:
    "Requires migration 029 and first-touch capture from deploy date. Legacy events have unknown source.",
} as const;

/** Serialize range params for pagination / query links. */
export function adminRangeSearchParams(range: DateRange, inputs: { from: string; to: string }): URLSearchParams {
  const params = new URLSearchParams();
  params.set("preset", range.preset);
  if (range.preset === "custom") {
    params.set("from", inputs.from);
    params.set("to", inputs.to);
  }
  return params;
}
