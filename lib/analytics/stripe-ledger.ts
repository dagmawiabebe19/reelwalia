import type Stripe from "stripe";
import { logBillingEvent, logEpisodeEvent, resolveSeriesIdFromEpisode } from "@/lib/analytics/log-event";
import { createAdminClient } from "@/lib/supabase/admin";
import { unwrapStripeResponse } from "@/lib/stripe/helpers";
import { getStripe } from "@/lib/stripe/server";
import { findUserIdByCustomerId } from "@/lib/stripe/sync";

type InvoiceWithLegacyFields = Stripe.Invoice & {
  charge?: string | Stripe.Charge | null;
  subscription?: string | Stripe.Subscription | null;
  tax?: number | null;
  total_taxes?: number | null;
  parent?: {
    subscription_details?: {
      metadata?: Stripe.Metadata | null;
      subscription?: string | Stripe.Subscription | null;
    };
  };
};

function invoiceChargeId(invoice: InvoiceWithLegacyFields): string | null {
  if (typeof invoice.charge === "string") return invoice.charge;
  if (invoice.charge && typeof invoice.charge === "object") return invoice.charge.id;
  return null;
}

function invoiceSubscriptionId(invoice: InvoiceWithLegacyFields): string | null {
  const direct = invoice.subscription;
  if (typeof direct === "string") return direct;
  if (direct && typeof direct === "object") return direct.id;
  const parent = invoice.parent?.subscription_details?.subscription;
  if (typeof parent === "string") return parent;
  if (parent && typeof parent === "object") return parent.id;
  return null;
}

function invoiceTaxCents(invoice: InvoiceWithLegacyFields): number {
  if (typeof invoice.tax === "number") return invoice.tax;
  if (typeof invoice.total_taxes === "number") return invoice.total_taxes;
  return 0;
}

function invoiceCustomerId(invoice: Stripe.Invoice): string | null {
  if (typeof invoice.customer === "string") return invoice.customer;
  return invoice.customer?.id ?? null;
}

async function processingFeeCents(chargeId: string | null): Promise<number> {
  if (!chargeId) return 0;
  try {
    const charge = await getStripe().charges.retrieve(chargeId, {
      expand: ["balance_transaction"],
    });
    const txn = charge.balance_transaction;
    if (txn && typeof txn !== "string") {
      return txn.fee ?? 0;
    }
  } catch (err) {
    console.error("[analytics] balance_transaction fee lookup failed:", err);
  }
  return 0;
}

async function metadataAttribution(params: {
  billingReason: string | null;
  invoice: InvoiceWithLegacyFields;
  subscription: Stripe.Subscription | null;
}): Promise<{ seriesId: string | null; episodeId: string | null }> {
  // Only the first paid invoice of a checkout is title-attributed.
  // Renewals stay unattributed and enter the watch-time pro-rata pool.
  if (params.billingReason !== "subscription_create") {
    return { seriesId: null, episodeId: null };
  }

  const episodeId =
    params.subscription?.metadata?.episode_id ||
    params.invoice.metadata?.episode_id ||
    params.invoice.parent?.subscription_details?.metadata?.episode_id ||
    null;

  const seriesFromMeta =
    params.subscription?.metadata?.series_id ||
    params.invoice.metadata?.series_id ||
    params.invoice.parent?.subscription_details?.metadata?.series_id ||
    null;

  if (seriesFromMeta) {
    return { seriesId: seriesFromMeta, episodeId: episodeId || null };
  }

  const resolved = await resolveSeriesIdFromEpisode(episodeId);
  return {
    seriesId: resolved?.seriesId ?? null,
    episodeId: resolved?.episodeId ?? episodeId,
  };
}

export async function recordInvoicePayment(invoice: Stripe.Invoice): Promise<void> {
  const inv = invoice as InvoiceWithLegacyFields;
  const gross = invoice.amount_paid ?? 0;
  if (gross <= 0) return;

  const invoiceId = invoice.id;
  if (!invoiceId) return;

  const stripe = getStripe();
  const subscriptionId = invoiceSubscriptionId(inv);
  let subscription: Stripe.Subscription | null = null;
  if (subscriptionId) {
    try {
      subscription = unwrapStripeResponse(
        await stripe.subscriptions.retrieve(subscriptionId)
      );
    } catch (err) {
      console.error("[analytics] subscription retrieve failed:", err);
    }
  }

  const customerId = invoiceCustomerId(invoice);
  const userId =
    subscription?.metadata?.user_id ||
    invoice.metadata?.user_id ||
    (customerId ? await findUserIdByCustomerId(customerId) : null) ||
    null;

  const { seriesId, episodeId } = await metadataAttribution({
    billingReason: invoice.billing_reason ?? null,
    invoice: inv,
    subscription,
  });

  const chargeId = invoiceChargeId(inv);
  const fee = await processingFeeCents(chargeId);

  await logBillingEvent({
    userId,
    seriesId,
    episodeId,
    stripeInvoiceId: invoiceId,
    stripeChargeId: chargeId,
    eventType: "payment",
    amountGrossCents: gross,
    processingFeeCents: fee,
    taxCents: invoiceTaxCents(inv),
    appStoreCents: 0,
    deliveryCents: 0,
    currency: invoice.currency ?? "usd",
    createdAt: invoice.created
      ? new Date(invoice.created * 1000).toISOString()
      : undefined,
  });

  if (invoice.billing_reason === "subscription_create" && seriesId) {
    await logEpisodeEvent({
      userId,
      seriesId,
      episodeId,
      eventType: "purchase",
    });
  }
}

export async function recordChargeRefund(charge: Stripe.Charge): Promise<void> {
  const refunded = charge.amount_refunded ?? 0;
  if (refunded <= 0) return;

  const chargeWithInvoice = charge as Stripe.Charge & {
    invoice?: string | { id: string } | null;
  };
  const invoiceId =
    (typeof chargeWithInvoice.invoice === "string"
      ? chargeWithInvoice.invoice
      : chargeWithInvoice.invoice?.id) ?? `charge:${charge.id}`;

  let seriesId: string | null = null;
  let episodeId: string | null = null;
  let userId: string | null = null;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("billing_events")
      .select("series_id, episode_id, user_id")
      .eq("stripe_invoice_id", invoiceId)
      .eq("event_type", "payment")
      .maybeSingle();
    if (!data) return;
    seriesId = data.series_id ?? null;
    episodeId = data.episode_id ?? null;
    userId = data.user_id ?? null;
  } catch {
    return;
  }

  await logBillingEvent({
    userId,
    seriesId,
    episodeId,
    stripeInvoiceId: invoiceId,
    stripeChargeId: charge.id,
    eventType: "refund",
    amountGrossCents: refunded,
    processingFeeCents: 0,
    taxCents: 0,
    appStoreCents: 0,
    deliveryCents: 0,
    currency: charge.currency ?? "usd",
  });
}
