export type DatePreset = "30d" | "quarter" | "custom";

export type DateRange = {
  from: Date;
  to: Date;
  preset: DatePreset;
  label: string;
};

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function currentUtcQuarter(now = new Date()): { from: Date; to: Date; label: string } {
  const year = now.getUTCFullYear();
  const quarter = Math.floor(now.getUTCMonth() / 3);
  const from = new Date(Date.UTC(year, quarter * 3, 1));
  const to = new Date(Date.UTC(year, quarter * 3 + 3, 1));
  return { from, to, label: `Q${quarter + 1} ${year}` };
}

export function parseAnalyticsRange(params: {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
  now?: Date;
}): DateRange {
  const now = params.now ?? new Date();
  const preset = (params.preset as DatePreset) || "30d";

  if (preset === "quarter") {
    const q = currentUtcQuarter(now);
    return { from: q.from, to: q.to, preset: "quarter", label: q.label };
  }

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

  const to = now;
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to, preset: "30d", label: "Last 30 days" };
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
} as const;
