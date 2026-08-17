import { createAdminClient } from "@/lib/supabase/admin";
import {
  ANALYTICS_METRIC_NOTES,
  LICENSOR_SHARE,
  type DateRange,
} from "@/lib/admin/analytics-range";
import {
  analyticsActorId,
  computeEpisodeDropOff,
  countHistoryCompletionsRecovered,
} from "@/lib/admin/analytics-dropoff";
import {
  PAYWALL_VARIANT_AFTER_1,
  PAYWALL_VARIANT_AFTER_2,
  VARIANT_LABELS,
  type PaywallVariant,
} from "@/lib/paywall-ab";
import { type TrafficSourceFilter } from "@/lib/traffic-source";

const PAYWALL_AB_ARMS: PaywallVariant[] = [PAYWALL_VARIANT_AFTER_1, PAYWALL_VARIANT_AFTER_2];

export type MetricSource = "events" | "watch_history" | "combined" | "untracked";

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
  sourceFilter: TrafficSourceFilter;
  tablesReady: boolean;
  trafficSourceReady: boolean;
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
  paywallAb: PaywallAbAnalytics;
  /** Signed-in completions in watch_history missing from episode_events (this range). */
  historyCompletionsRecovered: number | null;
};

export type PaywallAbArm = {
  variant: PaywallVariant;
  label: string;
  users: number | null;
  paywallReached: number | null;
  purchased: number | null;
  conversionRate: number | null;
  subsPerUser: number | null;
};

export type PaywallAbAnalytics = {
  tracked: boolean;
  note: string;
  arms: PaywallAbArm[];
};

function isMissingRelation(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}


export async function listAnalyticsSeries(): Promise<SeriesOption[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("series")
    .select("id, title, slug, status, total_episodes, free_episode_count")
    .order("title", { ascending: true });
  return (data ?? []) as SeriesOption[];
}

function matchesTrafficFilter(
  trafficSource: string | null | undefined,
  filter: TrafficSourceFilter
): boolean {
  if (filter === "all") return true;
  return trafficSource === filter;
}

async function loadProfileIdsForTrafficFilter(
  admin: ReturnType<typeof createAdminClient>,
  filter: TrafficSourceFilter
): Promise<Set<string> | null> {
  if (filter === "all") return null;
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("traffic_source", filter);
  if (error) return new Set();
  return new Set((data ?? []).map((row) => row.id as string));
}

export async function loadSeriesAnalytics(
  seriesId: string,
  range: DateRange,
  options?: { sourceFilter?: TrafficSourceFilter }
): Promise<SeriesAnalytics | null> {
  const sourceFilter = options?.sourceFilter ?? "all";
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

  let eventsQuery = await admin
    .from("episode_events")
    .select(
      "user_id, episode_id, event_type, created_at, paywall_variant, visitor_id, traffic_source"
    )
    .eq("series_id", seriesId)
    .gte("created_at", fromIso)
    .lt("created_at", toIso);

  if (eventsQuery.error && isMissingRelation(eventsQuery.error)) {
    const fallback = await admin
      .from("episode_events")
      .select("user_id, episode_id, event_type, created_at")
      .eq("series_id", seriesId)
      .gte("created_at", fromIso)
      .lt("created_at", toIso);
    eventsQuery = fallback as typeof eventsQuery;
  }

  const tablesReady = !isMissingRelation(eventsQuery.error);
  const trafficSourceReady =
    tablesReady &&
    !eventsQuery.error &&
    (eventsQuery.data?.length === 0 ||
      eventsQuery.data?.some((row) => "traffic_source" in row));
  let events = tablesReady ? eventsQuery.data ?? [] : [];
  if (sourceFilter !== "all") {
    events = events.filter((row) =>
      matchesTrafficFilter(
        "traffic_source" in row ? (row.traffic_source as string | null) : null,
        sourceFilter
      )
    );
  }

  const profileIds = await loadProfileIdsForTrafficFilter(admin, sourceFilter);

  const historyQuery = await admin
    .from("watch_history")
    .select("user_id, episode_id, completed, last_watched_at, created_at")
    .eq("series_id", seriesId)
    .gte("last_watched_at", fromIso)
    .lt("last_watched_at", toIso);

  let history = historyQuery.data ?? [];
  if (profileIds) {
    history = history.filter((row) => profileIds.has(row.user_id));
  }

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

  const canTrackCompletions =
    completeEvents.length > 0 || history.some((row) => row.completed);
  const historyCompletionsRecovered = tablesReady
    ? countHistoryCompletionsRecovered({ history, completeEvents })
    : history.some((row) => row.completed)
      ? countHistoryCompletionsRecovered({ history, completeEvents: [] })
      : null;

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
        note: "Signed-in users only. Guests are included in Total views but cannot be deduplicated without an account.",
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
          note: "Signed-in users only (watch_history). Guests are included in Total views when event tracking is on.",
        };

  const dropOff: EpisodeDropOff[] = episodeList.map((ep) => {
    const computed = computeEpisodeDropOff({
      episodeId: ep.id,
      startEvents,
      completeEvents,
      history,
      canTrackCompletions,
    });
    return {
      episodeId: ep.id,
      episodeNumber: ep.episode_number,
      title: ep.title,
      started: computed.started,
      finished: computed.finished,
      completionRate: computed.completionRate,
      source: computed.source,
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
      if (!row.episode_id) continue;
      const actor = analyticsActorId(row);
      if (!actor || !actor.startsWith("u:")) continue;
      const userId = row.user_id!;
      const set = finishedByUser.get(userId) ?? new Set();
      set.add(row.episode_id);
      finishedByUser.set(userId, set);
    }
    completers = Array.from(finishedByUser.values()).filter(
      (set) => set.size >= episodeCount
    ).length;
    completionSource =
      completeEvents.length > 0 && history.some((row) => row.completed)
        ? "combined"
        : completeEvents.length > 0
          ? "events"
          : "watch_history";
  }

  const uniqueBase = uniqueViewers.value ?? 0;
  const fullSeriesCompletion = {
    value:
      !canTrackCompletions
        ? null
        : uniqueBase > 0 && completers != null
          ? (completers / uniqueBase) * 100
          : completers === 0
            ? 0
            : null,
    completers: canTrackCompletions ? completers : null,
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

  const revenue = await loadRevenue(
    admin,
    seriesId,
    fromIso,
    toIso,
    tablesReady,
    sourceFilter,
    profileIds
  );
  const paywallAb = await loadPaywallAb(
    admin,
    seriesId,
    fromIso,
    toIso,
    tablesReady,
    sourceFilter
  );

  return {
    series,
    range,
    sourceFilter,
    tablesReady,
    trafficSourceReady,
    views,
    uniqueViewers,
    fullSeriesCompletion,
    paywallConversion,
    dropOff,
    revenue,
    paywallAb,
    historyCompletionsRecovered,
  };
}

function eventIdentity(row: {
  user_id?: string | null;
  visitor_id?: string | null;
  created_at?: string;
}): string {
  if (row.user_id) return `u:${row.user_id}`;
  if (row.visitor_id) return `v:${row.visitor_id}`;
  return `t:${row.created_at ?? "unknown"}`;
}

function emptyAb(note: string): PaywallAbAnalytics {
  return {
    tracked: false,
    note,
    arms: PAYWALL_AB_ARMS.map((variant) => ({
      variant,
      label: VARIANT_LABELS[variant],
      users: null,
      paywallReached: null,
      purchased: null,
      conversionRate: null,
      subsPerUser: null,
    })),
  };
}

async function loadPaywallAb(
  admin: ReturnType<typeof createAdminClient>,
  _seriesId: string,
  fromIso: string,
  toIso: string,
  tablesReady: boolean,
  sourceFilter: TrafficSourceFilter
): Promise<PaywallAbAnalytics> {
  if (!tablesReady) {
    return emptyAb(
      "Requires migrations 027 and 028. A/B results appear after those are applied and new visitors are assigned."
    );
  }

  const assignments = await admin
    .from("paywall_assignments")
    .select("variant, visitor_id, user_id, created_at");

  if (assignments.error && isMissingRelation(assignments.error)) {
    return emptyAb(
      "Migration 028 is not applied yet. Assignments and per-variant event columns are missing."
    );
  }

  let assigned = (assignments.data ?? []).filter(
    (row) => row.created_at >= fromIso && row.created_at < toIso
  );

  if (sourceFilter !== "all") {
    const trafficAssignments = await admin
      .from("traffic_assignments")
      .select("visitor_id, user_id, source")
      .eq("source", sourceFilter);
    const trafficRows = trafficAssignments.error ? [] : trafficAssignments.data ?? [];
    const visitorIds = new Set(trafficRows.map((row) => row.visitor_id));
    const userIds = new Set(
      trafficRows.map((row) => row.user_id).filter((id): id is string => Boolean(id))
    );
    assigned = assigned.filter(
      (row) =>
        visitorIds.has(row.visitor_id) ||
        (row.user_id != null && userIds.has(row.user_id))
    );
  }

  const platformEvents = await admin
    .from("episode_events")
    .select(
      "user_id, visitor_id, paywall_variant, event_type, series_id, created_at, traffic_source"
    )
    .gte("created_at", fromIso)
    .lt("created_at", toIso)
    .in("event_type", ["paywall_hit", "purchase"]);

  let events = platformEvents.error ? [] : platformEvents.data ?? [];
  if (sourceFilter !== "all") {
    events = events.filter((row) =>
      matchesTrafficFilter(
        "traffic_source" in row ? (row.traffic_source as string | null) : null,
        sourceFilter
      )
    );
  }

  const note =
    "Decision metric is total subscribers and subscribers per assigned user — not conversion rate. Group A hits the wall sooner, so its rate will look higher even if it produces fewer paying subscribers. Users = new assignments in this date range; subscribers = first purchases in this range (platform-wide).";

  const arms: PaywallAbArm[] = PAYWALL_AB_ARMS.map(
    (variant) => {
      const users = assigned.filter((row) => row.variant === variant).length;
      const hits = events.filter(
        (row) => row.event_type === "paywall_hit" && row.paywall_variant === variant
      );
      const platformPurchases = events.filter(
        (row) => row.event_type === "purchase" && row.paywall_variant === variant
      );
      const paywallReached = new Set(hits.map((row) => eventIdentity(row))).size;
      const purchased = platformPurchases.length;
      return {
        variant,
        label: VARIANT_LABELS[variant],
        users,
        paywallReached,
        purchased,
        conversionRate: paywallReached > 0 ? (purchased / paywallReached) * 100 : 0,
        subsPerUser: users > 0 ? purchased / users : purchased === 0 ? 0 : null,
      };
    }
  );

  return { tracked: true, note, arms };
}

async function loadRevenue(
  admin: ReturnType<typeof createAdminClient>,
  seriesId: string,
  fromIso: string,
  toIso: string,
  tablesReady: boolean,
  sourceFilter: TrafficSourceFilter,
  profileIds: Set<string> | null
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
      "series_id, event_type, amount_gross_cents, processing_fee_cents, tax_cents, app_store_cents, delivery_cents, created_at, traffic_source, user_id"
    )
    .gte("created_at", fromIso)
    .lt("created_at", toIso);

  if (billing.error || !billing.data) {
    return untracked;
  }

  let rows = billing.data;
  if (sourceFilter !== "all") {
    rows = rows.filter((row) =>
      matchesTrafficFilter(
        "traffic_source" in row ? (row.traffic_source as string | null) : null,
        sourceFilter
      )
    );
  }
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
    .select("series_id, progress_seconds, user_id")
    .gte("last_watched_at", fromIso)
    .lt("last_watched_at", toIso);

  const secondsBySeries = new Map<string, number>();
  let totalSeconds = 0;
  for (const row of watchTime.data ?? []) {
    if (profileIds && !profileIds.has(row.user_id)) continue;
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
