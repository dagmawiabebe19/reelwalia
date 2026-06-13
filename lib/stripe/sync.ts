import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StripePlanKey } from "@/lib/stripe/plans";
import { mapPlanToDbPlan } from "@/lib/stripe/plans";
import { getSubscriptionPeriod } from "@/lib/stripe/helpers";
import { mapStripeSubscriptionStatus } from "@/lib/stripe/server";

export async function syncSubscriptionToDatabase(params: {
  userId: string;
  customerId: string;
  subscription: Stripe.Subscription;
  plan?: StripePlanKey | string | null;
}) {
  const admin = createAdminClient();
  const { userId, customerId, subscription } = params;

  const planKey =
    (params.plan as StripePlanKey | undefined) ??
    (subscription.metadata.plan as StripePlanKey | undefined) ??
    "1month";

  const status = mapStripeSubscriptionStatus(subscription.status);
  const dbPlan = mapPlanToDbPlan(planKey as StripePlanKey);
  const period = getSubscriptionPeriod(subscription);

  const periodStart = new Date(period.current_period_start * 1000).toISOString();
  const periodEnd = new Date(period.current_period_end * 1000).toISOString();

  await admin
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      subscription_id: subscription.id,
      subscription_status: status,
      subscription_plan: dbPlan,
      current_period_end: periodEnd,
    })
    .eq("id", userId);

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  const row = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan: dbPlan,
    status,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: subscription.cancel_at_period_end,
  };

  if (existing) {
    await admin.from("subscriptions").update(row).eq("id", existing.id);
  } else {
    await admin.from("subscriptions").insert(row);
  }
}

export async function findUserIdByCustomerId(
  customerId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function deactivateSubscription(userId: string) {
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      subscription_status: "canceled",
      subscription_plan: "free",
      subscription_id: null,
      current_period_end: null,
    })
    .eq("id", userId);
}
