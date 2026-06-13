import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StripePlanKey } from "@/lib/stripe/plans";
import { getPlanPriceIds } from "@/lib/stripe/plans";
import {
  getSubscriptionPeriod,
  unwrapStripeResponse,
} from "@/lib/stripe/helpers";

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
  successUrl: string;
  cancelUrl: string;
  episodeId?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const { introPriceId } = getPlanPriceIds(params.plan);
  const customerId = await getOrCreateCustomer(params.userId, params.email);

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: introPriceId, quantity: 1 }],
    subscription_data: {
      metadata: {
        user_id: params.userId,
        plan: params.plan,
        ...(params.episodeId ? { episode_id: params.episodeId } : {}),
      },
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      user_id: params.userId,
      plan: params.plan,
      ...(params.episodeId ? { episode_id: params.episodeId } : {}),
    },
  });
}

export async function createGuestCheckoutSession(params: {
  plan: StripePlanKey;
  successUrl: string;
  cancelUrl: string;
  episodeId?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const { introPriceId } = getPlanPriceIds(params.plan);

  return stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: introPriceId, quantity: 1 }],
    customer_creation: "always",
    subscription_data: {
      metadata: {
        plan: params.plan,
        ...(params.episodeId ? { episode_id: params.episodeId } : {}),
      },
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      plan: params.plan,
      ...(params.episodeId ? { episode_id: params.episodeId } : {}),
    },
  });
}

export interface VerifiedCheckoutSession {
  active: boolean;
  email: string | null;
  episodeId: string | null;
  customerId: string | null;
}

export async function verifyCheckoutSession(
  sessionId: string
): Promise<VerifiedCheckoutSession | null> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (session.status !== "complete") {
    return null;
  }

  const subscription =
    typeof session.subscription === "string"
      ? unwrapStripeResponse(await stripe.subscriptions.retrieve(session.subscription))
      : session.subscription
        ? unwrapStripeResponse(session.subscription)
        : null;

  const active =
    subscription != null &&
    (subscription.status === "active" || subscription.status === "trialing");

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;

  return {
    active,
    email: session.customer_details?.email ?? null,
    episodeId: session.metadata?.episode_id ?? null,
    customerId,
  };
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

/** After intro checkout, schedule transition to standard price after one billing period. */
export async function scheduleIntroToStandardTransition(
  subscriptionId: string,
  plan: StripePlanKey
): Promise<void> {
  const stripe = getStripe();
  const { introPriceId, standardPriceId } = getPlanPriceIds(plan);

  const subscription = unwrapStripeResponse(
    await stripe.subscriptions.retrieve(subscriptionId)
  );
  const period = getSubscriptionPeriod(subscription);

  const schedule = await stripe.subscriptionSchedules.create({
    from_subscription: subscriptionId,
  });

  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: "release",
    phases: [
      {
        items: [{ price: introPriceId, quantity: 1 }],
        start_date: period.current_period_start,
        end_date: period.current_period_end,
      },
      {
        items: [{ price: standardPriceId, quantity: 1 }],
      },
    ],
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
