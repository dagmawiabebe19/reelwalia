import type { Profile } from "@/lib/types/database";
import {
  freeEpisodeCountForVariant,
  type PaywallVariant,
} from "@/lib/paywall-ab";

/** Default free episodes when series.free_episode_count is unset and viewer is not in the A/B test. */
export const DEFAULT_FREE_EPISODE_COUNT = 2;

export function resolveFreeEpisodeCount(count: number | null | undefined): number {
  if (count == null || count < 0) return DEFAULT_FREE_EPISODE_COUNT;
  return count;
}

/** Runtime cutoff: assigned A/B variant wins; otherwise series catalog default. */
export function resolveViewerFreeEpisodeCount(
  seriesCount: number | null | undefined,
  variant: PaywallVariant | null
): number {
  if (variant) return freeEpisodeCountForVariant(variant);
  return resolveFreeEpisodeCount(seriesCount);
}

export function isEpisodeFree(
  episodeNumber: number,
  freeEpisodeCount: number
): boolean {
  return episodeNumber <= freeEpisodeCount;
}

export function hasActiveSubscription(profile: Pick<Profile, "subscription_status"> | null): boolean {
  if (!profile) return false;
  return (
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing"
  );
}

export function canWatchEpisode(
  episodeNumber: number,
  freeEpisodeCount: number,
  profile: Pick<Profile, "subscription_status"> | null
): boolean {
  return isEpisodeFree(episodeNumber, freeEpisodeCount) || hasActiveSubscription(profile);
}
