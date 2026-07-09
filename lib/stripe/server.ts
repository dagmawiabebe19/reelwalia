import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StripePlanKey } from "@/lib/stripe/plans";
import {
  getSeriesUnlockPriceId,
  getSubscriptionPriceId,
} from "@/lib/stripe/prices";
import { unwrapStripeResponse } from "@/lib/stripe/helpers";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeSingleton) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
    stripeSingleton = new Stripe(key, {
      // User-specified API version; cast for SDK type pin
      apiVersion: "2024-12-18.acacia" as "2026-05-27.dahlia",
      typescript: true,
    });
  }
  return stripeSingleton;
}

export async function getOrCreateCustomer(
  userId: string,
  email: string
): Promise<string> {
  const admin = createAdminClient();
  const stripe = getStripe();

  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });

  await admin
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);

  return customer.id;
}

export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  plan: StripePlanKey;
  baseUrl: string;
  episodeId?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const priceId = getSubscriptionPriceId(params.plan);
  const customerId = await getOrCreateCustomer(params.userId, params.email);

  const successUrl = params.episodeId
    ? `${params.baseUrl}/watch/${params.episodeId}?subscribed=true`
    : `${params.baseUrl}/account?subscribed=true`;
  const cancelUrl = params.episodeId
    ? `${params.baseUrl}/watch/${params.episodeId}`
    : `${params.baseUrl}/`;

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: {
        app: "reelwalia",
        user_id: params.userId,
        plan: params.plan,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      app: "reelwalia",
      user_id: params.userId,
      plan: params.plan,
      ...(params.episodeId ? { episode_id: params.episodeId } : {}),
    },
  });
}

export async function createGuestCheckoutSession(params: {
  plan: StripePlanKey;
  baseUrl: string;
  episodeId?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const priceId = getSubscriptionPriceId(params.plan);

  const episodeQuery = params.episodeId
    ? `&episodeId=${encodeURIComponent(params.episodeId)}`
    : "";
  const successUrl = `${params.baseUrl}/auth/checkout-success?session_id={CHECKOUT_SESSION_ID}${episodeQuery}`;
  const cancelUrl = params.episodeId
    ? `${params.baseUrl}/watch/${params.episodeId}`
    : `${params.baseUrl}/`;

  return stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: {
        app: "reelwalia",
        plan: params.plan,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      app: "reelwalia",
      plan: params.plan,
      ...(params.episodeId ? { episode_id: params.episodeId } : {}),
    },
  });
}

/** One-time "unlock all episodes of a series" purchase (signed-in buyer). */
export async function createSeriesUnlockCheckoutSession(params: {
  userId: string;
  email: string;
  seriesId: string;
  baseUrl: string;
  episodeId?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const priceId = getSeriesUnlockPriceId();
  const customerId = await getOrCreateCustomer(params.userId, params.email);

  const successUrl = params.episodeId
    ? `${params.baseUrl}/watch/${params.episodeId}?session_id={CHECKOUT_SESSION_ID}`
    : `${params.baseUrl}/account?unlocked=true`;
  const cancelUrl = params.episodeId
    ? `${params.baseUrl}/watch/${params.episodeId}`
    : `${params.baseUrl}/`;

  const metadata = {
    app: "reelwalia",
    kind: "series_unlock",
    user_id: params.userId,
    series_id: params.seriesId,
    ...(params.episodeId ? { episode_id: params.episodeId } : {}),
  };

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    payment_intent_data: { metadata },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata,
  });
}

/** One-time series unlock for guests — account created via webhook by email. */
export async function createGuestSeriesUnlockCheckoutSession(params: {
  seriesId: string;
  baseUrl: string;
  episodeId?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const priceId = getSeriesUnlockPriceId();

  const episodeQuery = params.episodeId
    ? `&episodeId=${encodeURIComponent(params.episodeId)}`
    : "";
  const successUrl = `${params.baseUrl}/auth/checkout-success?session_id={CHECKOUT_SESSION_ID}${episodeQuery}`;
  const cancelUrl = params.episodeId
    ? `${params.baseUrl}/watch/${params.episodeId}`
    : `${params.baseUrl}/`;

  const metadata = {
    app: "reelwalia",
    kind: "series_unlock",
    series_id: params.seriesId,
    ...(params.episodeId ? { episode_id: params.episodeId } : {}),
  };

  return stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    payment_intent_data: { metadata },
    customer_creation: "always",
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata,
  });
}

export type CheckoutKind = "subscription" | "series_unlock";

export interface VerifiedCheckoutSession {
  active: boolean;
  kind: CheckoutKind;
  email: string | null;
  episodeId: string | null;
  seriesId: string | null;
  customerId: string | null;
}

export async function verifyCheckoutSession(
  sessionId: string
): Promise<VerifiedCheckoutSession | null> {
  if (!sessionId?.trim()) return null;

  try {
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (session.status !== "complete") {
      return null;
    }

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null;

    const kind: CheckoutKind =
      session.mode === "payment" ? "series_unlock" : "subscription";

    let active = false;
    if (kind === "series_unlock") {
      active = session.payment_status === "paid";
    } else {
      const subscription =
        typeof session.subscription === "string"
          ? unwrapStripeResponse(
              await stripe.subscriptions.retrieve(session.subscription)
            )
          : session.subscription
            ? unwrapStripeResponse(session.subscription)
            : null;
      active =
        subscription != null &&
        (subscription.status === "active" ||
          subscription.status === "trialing");
    }

    return {
      active,
      kind,
      email: session.customer_details?.email ?? null,
      episodeId: session.metadata?.episode_id ?? null,
      seriesId: session.metadata?.series_id ?? null,
      customerId,
    };
  } catch (err) {
    console.error("verifyCheckoutSession failed:", err);
    return null;
  }
}

export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): string {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
      return "canceled";
    default:
      return "none";
  }
}
