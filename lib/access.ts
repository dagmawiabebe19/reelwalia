import type { Profile } from "@/lib/types/database";

/** Default free episodes when series.free_episode_count is unset. */
export const DEFAULT_FREE_EPISODE_COUNT = 5;

export function resolveFreeEpisodeCount(count: number | null | undefined): number {
  if (count == null || count < 0) return DEFAULT_FREE_EPISODE_COUNT;
  return count;
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

/**
 * Whether a viewer can watch a given episode.
 *
 * Access is granted by any of:
 *  - the episode being within the free window, or
 *  - an active "all shows" subscription, or
 *  - a one-time purchase that unlocks this series (`hasSeriesPurchase`).
 */
export function canWatchEpisode(
  episodeNumber: number,
  freeEpisodeCount: number,
  profile: Pick<Profile, "subscription_status"> | null,
  hasSeriesPurchase = false
): boolean {
  return (
    isEpisodeFree(episodeNumber, freeEpisodeCount) ||
    hasActiveSubscription(profile) ||
    hasSeriesPurchase
  );
}
