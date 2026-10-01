import type { Profile } from "@/lib/types/database";
/** Default free episodes when series.free_episode_count is unset. */
export const DEFAULT_FREE_EPISODE_COUNT = 2;

/** Platform-wide paywall: episodes 1–4 free for every viewer, paywall after episode 4. */
export const PAYWALL_FREE_EPISODE_COUNT = 4;

export function resolveFreeEpisodeCount(count: number | null | undefined): number {
  if (count == null || count < 0) return DEFAULT_FREE_EPISODE_COUNT;
  return count;
}

/** Runtime cutoff for viewers — fixed platform-wide, ignoring legacy A/B buckets and series overrides. */
export function resolveViewerFreeEpisodeCount(): number {
  return PAYWALL_FREE_EPISODE_COUNT;
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
