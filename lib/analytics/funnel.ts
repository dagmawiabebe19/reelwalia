import { track } from "@vercel/analytics";
import type { StripePlanKey } from "@/lib/stripe/plans";

export type PaywallTrigger =
  | "end_of_free_trial"
  | "locked_episode_click"
  | "direct_navigation"
  | "manual_subscribe_button";

export function trackEpisodeStarted(props: {
  episode_id: string;
  series_slug: string;
  episode_number: number;
  is_free: boolean;
  is_authenticated: boolean;
  is_subscribed: boolean;
}) {
  track("episode_started", props);
}

export function trackEpisodeCompleted(props: {
  episode_id: string;
  series_slug: string;
  episode_number: number;
  watch_time_seconds: number;
  total_duration_seconds: number;
  completion_percentage: number;
}) {
  track("episode_completed", props);
}

export function trackEpisodeAdvanced(props: {
  from_episode_id: string;
  to_episode_id: string;
  series_slug: string;
  method: "autoplay" | "manual_tap";
}) {
  track("episode_advanced", props);
}

export function trackPaywallViewed(props: {
  episode_id: string;
  series_slug: string;
  trigger: PaywallTrigger;
}) {
  track("paywall_viewed", props);
}

export function trackSubscriptionCheckoutStarted(props: {
  plan: StripePlanKey;
  price_amount: number;
  currency: string;
  episode_id: string | undefined;
}) {
  track("subscription_checkout_started", props);
}
