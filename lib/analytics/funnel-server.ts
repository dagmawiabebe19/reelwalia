import { track } from "@vercel/analytics/server";
import type { StripePlanKey } from "@/lib/stripe/plans";

export async function trackSubscriptionCompleted(props: {
  plan: StripePlanKey | string;
  price_amount: number;
  currency: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
}) {
  try {
    await track("subscription_completed", props);
  } catch (err) {
    console.error("[analytics] subscription_completed failed:", err);
  }
}
