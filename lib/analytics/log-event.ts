import { createAdminClient } from "@/lib/supabase/admin";
import type { PaywallVariant } from "@/lib/paywall-ab";

export type EpisodeEventType =
  | "start"
  | "progress"
  | "complete"
  | "paywall_hit"
  | "purchase";

export type BillingEventType = "payment" | "refund";

function isMissingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

export async function logEpisodeEvent(params: {
  userId?: string | null;
  seriesId: string;
  episodeId?: string | null;
  eventType: EpisodeEventType;
  paywallVariant?: PaywallVariant | null;
  visitorId?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const row: Record<string, unknown> = {
      user_id: params.userId ?? null,
      series_id: params.seriesId,
      episode_id: params.episodeId ?? null,
      event_type: params.eventType,
    };
    if (params.paywallVariant) row.paywall_variant = params.paywallVariant;
    if (params.visitorId) row.visitor_id = params.visitorId;

    const { error } = await admin.from("episode_events").insert(row);
    if (error && isMissingRelation(error) && (params.paywallVariant || params.visitorId)) {
      const { error: retryError } = await admin.from("episode_events").insert({
        user_id: params.userId ?? null,
        series_id: params.seriesId,
        episode_id: params.episodeId ?? null,
        event_type: params.eventType,
      });
      if (retryError && !isMissingRelation(retryError)) {
        console.error("[analytics] episode_events insert failed:", retryError.message);
      }
      return;
    }
    if (error && !isMissingRelation(error)) {
      console.error("[analytics] episode_events insert failed:", error.message);
    }
  } catch (err) {
    console.error("[analytics] episode_events insert threw:", err);
  }
}

export async function logBillingEvent(params: {
  userId?: string | null;
  seriesId?: string | null;
  episodeId?: string | null;
  stripeInvoiceId?: string | null;
  stripeChargeId?: string | null;
  eventType: BillingEventType;
  amountGrossCents: number;
  processingFeeCents?: number;
  taxCents?: number;
  appStoreCents?: number;
  deliveryCents?: number;
  currency?: string;
  createdAt?: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("billing_events").upsert(
      {
        user_id: params.userId ?? null,
        series_id: params.seriesId ?? null,
        episode_id: params.episodeId ?? null,
        stripe_invoice_id: params.stripeInvoiceId ?? null,
        stripe_charge_id: params.stripeChargeId ?? null,
        event_type: params.eventType,
        amount_gross_cents: params.amountGrossCents,
        processing_fee_cents: params.processingFeeCents ?? 0,
        tax_cents: params.taxCents ?? 0,
        app_store_cents: params.appStoreCents ?? 0,
        delivery_cents: params.deliveryCents ?? 0,
        currency: params.currency ?? "usd",
        created_at: params.createdAt ?? new Date().toISOString(),
      },
      { onConflict: "stripe_invoice_id,event_type" }
    );
    if (error && !isMissingRelation(error)) {
      console.error("[analytics] billing_events insert failed:", error.message);
    }
  } catch (err) {
    console.error("[analytics] billing_events insert threw:", err);
  }
}

export async function resolveSeriesIdFromEpisode(
  episodeId: string | null | undefined
): Promise<{ seriesId: string; episodeId: string } | null> {
  if (!episodeId) return null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("episodes")
      .select("id, series_id")
      .eq("id", episodeId)
      .maybeSingle();
    if (!data?.series_id) return null;
    return { seriesId: data.series_id, episodeId: data.id };
  } catch {
    return null;
  }
}
