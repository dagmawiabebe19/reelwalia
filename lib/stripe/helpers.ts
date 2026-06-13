import type Stripe from "stripe";

/** Stripe SDK v20+ moved billing period fields to subscription items. */
export function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  current_period_start: number;
  current_period_end: number;
} {
  const item = subscription.items.data[0];
  if (!item) {
    throw new Error("Subscription has no items");
  }
  return {
    current_period_start: item.current_period_start,
    current_period_end: item.current_period_end,
  };
}

export function unwrapStripeResponse<T>(value: T | Stripe.Response<T>): T {
  return value as T;
}
