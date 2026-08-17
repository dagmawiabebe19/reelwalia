import { createAdminClient } from "@/lib/supabase/admin";
import {
  ANALYTICS_METRIC_NOTES,
  LICENSOR_SHARE,
  type DateRange,
} from "@/lib/admin/analytics-range";

export type MetricSource = "events" | "watch_history" | "untracked";

export type SeriesOption = {
  id: string;
  title: string;
  slug: string;
  status: string;
  total_episodes: number;
  free_episode_count: number;
};

export type EpisodeDropOff = {
  episodeId: string;
  episodeNumber: number;
  title: string;
  started: number | null;
  finished: number | null;
  completionRate: number | null;
  source: MetricSource;
};

export type RevenueBreakdown = {
  tracked: boolean;
  grossCents: number | null;
  processingFeeCents: number | null;
  taxCents: number | null;
  refundsCents: number | null;
  appStoreCents: number | null;
  deliveryCents: number | null;
  deliveryTracked: boolean;
  netCents: number | null;
  licensorShareCents: number | null;
  directCents: number | null;
  prorataCents: number | null;
  note: string;
};

export type SeriesAnalytics = {
  series: SeriesOption;
  range: DateRange;
  tablesReady: boolean;
  views: { value: number | null; source: MetricSource; note: string };
  uniqueViewers: { value: number | null; source: MetricSource; note: string };
  fullSeriesCompletion: { value: number | null; completers: number | null; source: MetricSource; note: string };
  paywallConversion: {
    reached: number | null;
    purchased: number | null;
    rate: number | null;
    source: MetricSource;
    note: string;
  };
  dropOff: EpisodeDropOff[];
  revenue: RevenueBreakdown;
};

function isMissingRelation(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

function rate(finished: number, started: number): number | null {
  if (started <= 0) return null;
  return (finished / started) * 100;
}

export async function listAnalyticsSeries(): Promise<SeriesOption[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("series")
    .select("id, title, slug, status, total_episodes, free_episode_count")
    .order("title", { ascending: true });
  return (data ?? []) as SeriesOption[];
}

export async function loadSeriesAnalytics(
  seriesId: string,
  range: DateRange
): Promise<SeriesAnalytics | null> {
  const admin = createAdminClient();
  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();

  const { data: seriesRow } = await admin
    .from("series")
    .select("id, title, slug, status, total_episodes, free_episode_count")
    .eq("id", seriesId)
    .maybeSingle();

  if (!seriesRow) return null;
  const series = seriesRow as SeriesOption;

  const { data: episodes } = await admin
    .from("episodes")
    .select("id, episode_number, title")
    .eq("series_id", seriesId)
    .order("episode_number", { ascending: true });

  const episodeList = (episodes ?? []) as {
    id: string;
    episode_number: number;
    title: string;
  }[];

  const eventsQuery = await admin
    .from("episode_events")
    .select("user_id, episode_id, event_type, created_at")
    .eq("series_id", seriesId)
    .gte("created_at", fromIso)
    .lt("created_at", toIso);

  const tablesReady = !isMissingRelation(eventsQuery.error);
  const events = tablesReady ? eventsQuery.data ?? [] : [];

  const historyQuery = await admin
    .from("watch_history")
    .select("user_id, episode_id, completed, last_watched_at, created_at")
    .eq("series_id", seriesId)
    .gte("last_watched_at", fromIso)
    .lt("last_watched_at", toIso);

  const history = historyQuery.data ?? [];

  const startEvents = events.filter((e) => e.event_type === "start");
  const completeEvents = events.filter((e) => e.event_type === "complete");
  const paywallEvents = events.filter((e) => e.event_type === "paywall_hit");
  const purchaseEvents = events.filter((e) => e.event_type === "purchase");

  const viewsFromEvents = startEvents.length;
  const uniqueFromEvents = new Set(
    [...startEvents, ...completeEvents]
      .map((e) => e.user_id)
      .filter((id): id is string => Boolean(id))
  ).size;
  const uniqueFromHistory = new Set(history.map((h) => h.user_id)).size;

  const views = tablesReady
    ? {
        value: viewsFromEvents,
        source: "events" as MetricSource,
        note: "Count of play-start events in the selected range (signed-in and guest).",
      }
    : {
        value: null,
        source: "untracked" as MetricSource,
        note: ANALYTICS_METRIC_NOTES.views,
      };

  const hasEventPlays = startEvents.length > 0 || completeEvents.length > 0;
  const uniqueViewers = tablesReady && hasEventPlays
    ? {
        value: uniqueFromEvents,
        source: "events" as MetricSource,
        note: "Distinct signed-in users who started or completed an episode. Guests appear in views but are not uniquely identified.",
      }
    : historyQuery.error
      ? {
          value: null,
          source: "untracked" as MetricSource,
          note: ANALYTICS_METRIC_NOTES.uniqueViewers,
        }
      : {
          value: uniqueFromHistory,
          source: "watch_history" as MetricSource,
          note: "Distinct signed-in users with watch_history in range (last_watched_at). Guests excluded.",
        };

  const dropOff: EpisodeDropOff[] = episodeList.map((ep) => {
    const eventStarts = startEvents.filter((e) => e.episode_id === ep.id).length;
    const eventFinishes = new Set(
      completeEvents.filter((e) => e.episode_id === ep.id && e.user_id).map((e) => e.user_id)
    ).size;
    const histStarts = history.filter((h) => h.episode_id === ep.id).length;
    const histFinishes = history.filter((h) => h.episode_id === ep.id && h.completed).length;

    if (tablesReady && (eventStarts > 0 || eventFinishes > 0)) {
      const started = Math.max(eventStarts, eventFinishes);
      return {
        episodeId: ep.id,
        episodeNumber: ep.episode_number,
        title: ep.title,
        started,
        finished: eventFinishes,
        completionRate: rate(eventFinishes, started),
        source: "events",
      };
    }

    return {
      episodeId: ep.id,
      episodeNumber: ep.episode_number,
      title: ep.title,
      started: histStarts,
      finished: histFinishes,
      completionRate: rate(histFinishes, histStarts),
      source: "watch_history",
    };
  });

  const episodeCount = episodeList.length;
  let completers: number | null = null;
  let completionSource: MetricSource = "untracked";

  if (episodeCount > 0) {
    const finishedByUser = new Map<string, Set<string>>();
    for (const row of history) {
      if (!row.completed) continue;
      const set = finishedByUser.get(row.user_id) ?? new Set();
      set.add(row.episode_id);
      finishedByUser.set(row.user_id, set);
    }
    for (const row of completeEvents) {
      if (!row.user_id || !row.episode_id) continue;
      const set = finishedByUser.get(row.user_id) ?? new Set();
      set.add(row.episode_id);
      finishedByUser.set(row.user_id, set);
    }
    completers = Array.from(finishedByUser.values()).filter(
      (set) => set.size >= episodeCount
    ).length;
    completionSource = completeEvents.length > 0 ? "events" : "watch_history";
  }

  const uniqueBase = uniqueViewers.value ?? 0;
  const fullSeriesCompletion = {
    value: uniqueBase > 0 && completers != null ? (completers / uniqueBase) * 100 : completers === 0 ? 0 : null,
    completers,
    source: completionSource,
    note:
      episodeCount === 0
        ? "No episodes in this series."
        : "Share of unique signed-in viewers who completed every episode in the series.",
  };

  const paywallReached = tablesReady ? new Set(paywallEvents.map((e) => e.user_id ?? e.created_at)).size : null;
  const purchased = tablesReady ? purchaseEvents.length : null;
  const paywallConversion = {
    reached: tablesReady ? paywallReached : null,
    purchased: tablesReady ? purchased : null,
    rate:
      tablesReady && paywallReached && paywallReached > 0 && purchased != null
        ? (purchased / paywallReached) * 100
        : tablesReady && paywallReached === 0
          ? 0
          : null,
    source: tablesReady ? ("events" as MetricSource) : ("untracked" as MetricSource),
    note: tablesReady
      ? "Paywall hits vs purchase events logged after migration 027."
      : ANALYTICS_METRIC_NOTES.paywall,
  };

  const revenue = await loadRevenue(admin, seriesId, fromIso, toIso, tablesReady);

  return {
    series,
    range,
    tablesReady,
    views,
    uniqueViewers,
    fullSeriesCompletion,
    paywallConversion,
    dropOff,
    revenue,
  };
}

async function loadRevenue(
  admin: ReturnType<typeof createAdminClient>,
  seriesId: string,
  fromIso: string,
  toIso: string,
  tablesReady: boolean
): Promise<RevenueBreakdown> {
  const untracked: RevenueBreakdown = {
    tracked: false,
    grossCents: null,
    processingFeeCents: null,
    taxCents: null,
    refundsCents: null,
    appStoreCents: null,
    deliveryCents: null,
    deliveryTracked: false,
    netCents: null,
    licensorShareCents: null,
    directCents: null,
    prorataCents: null,
    note: ANALYTICS_METRIC_NOTES.revenue,
  };

  if (!tablesReady) return untracked;

  const billing = await admin
    .from("billing_events")
    .select(
      "series_id, event_type, amount_gross_cents, processing_fee_cents, tax_cents, app_store_cents, delivery_cents, created_at"
    )
    .gte("created_at", fromIso)
    .lt("created_at", toIso);

  if (billing.error || !billing.data) {
    return untracked;
  }

  const rows = billing.data;
  if (!rows.length) {
    return {
      ...untracked,
      tracked: true,
      grossCents: 0,
      processingFeeCents: 0,
      taxCents: 0,
      refundsCents: 0,
      appStoreCents: 0,
      deliveryCents: 0,
      netCents: 0,
      licensorShareCents: 0,
      directCents: 0,
      prorataCents: 0,
      note: "No Stripe billing events in this range yet. Historical payments were not stored.",
    };
  }

  const payments = rows.filter((r) => r.event_type === "payment");
  const refunds = rows.filter((r) => r.event_type === "refund");

  const watchTime = await admin
    .from("watch_history")
    .select("series_id, progress_seconds")
    .gte("last_watched_at", fromIso)
    .lt("last_watched_at", toIso);

  const secondsBySeries = new Map<string, number>();
  let totalSeconds = 0;
  for (const row of watchTime.data ?? []) {
    const seconds = Math.max(0, row.progress_seconds ?? 0);
    totalSeconds += seconds;
    secondsBySeries.set(row.series_id, (secondsBySeries.get(row.series_id) ?? 0) + seconds);
  }
  const seriesShare = totalSeconds > 0 ? (secondsBySeries.get(seriesId) ?? 0) / totalSeconds : 0;

  let directGross = 0;
  let directFee = 0;
  let directTax = 0;
  let directApp = 0;
  let unattribGross = 0;
  let unattribFee = 0;
  let unattribTax = 0;
  let unattribApp = 0;
  let refundDirect = 0;
  let refundUnattrib = 0;

  for (const row of payments) {
    if (row.series_id === seriesId) {
      directGross += row.amount_gross_cents;
      directFee += row.processing_fee_cents;
      directTax += row.tax_cents;
      directApp += row.app_store_cents;
    } else if (!row.series_id) {
      unattribGross += row.amount_gross_cents;
      unattribFee += row.processing_fee_cents;
      unattribTax += row.tax_cents;
      unattribApp += row.app_store_cents;
    }
  }

  for (const row of refunds) {
    if (row.series_id === seriesId) refundDirect += row.amount_gross_cents;
    else if (!row.series_id) refundUnattrib += row.amount_gross_cents;
  }

  const prorataGross = Math.round(unattribGross * seriesShare);
  const prorataFee = Math.round(unattribFee * seriesShare);
  const prorataTax = Math.round(unattribTax * seriesShare);
  const prorataApp = Math.round(unattribApp * seriesShare);
  const prorataRefund = Math.round(refundUnattrib * seriesShare);

  const gross = directGross + prorataGross;
  const fees = directFee + prorataFee;
  const tax = directTax + prorataTax;
  const appStore = directApp + prorataApp;
  const refundsCents = refundDirect + prorataRefund;
  const delivery = 0;
  const net = gross - fees - tax - appStore - refundsCents - delivery;
  const licensor = Math.round(net * LICENSOR_SHARE);

  return {
    tracked: true,
    grossCents: gross,
    processingFeeCents: fees,
    taxCents: tax,
    refundsCents,
    appStoreCents: appStore,
    deliveryCents: delivery,
    deliveryTracked: false,
    netCents: net,
    licensorShareCents: licensor,
    directCents: directGross,
    prorataCents: prorataGross,
    note:
      "Gross = checkout-attributed payments to this series + pro-rata share of unattributed platform subscriptions by authenticated watch-time. Net = gross − Stripe fees − tax − app-store (0 on web) − refunds. Delivery costs are not tracked. Licensor share = 50% of Net Revenue.",
  };
}
