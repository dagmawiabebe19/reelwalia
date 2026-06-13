import type { Profile } from "@/lib/types/database";

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
