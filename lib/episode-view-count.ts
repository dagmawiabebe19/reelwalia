/** Fields used to resolve the view count shown on episode cards. */
export type EpisodeViewCountSource = {
  display_view_count?: number | null;
  /** Real tracking column — fallback only until analytics-backed counts replace display_view_count. */
  view_count?: number | null;
};

/**
 * Returns the number to show on episode cards.
 * Today: `display_view_count` when set, else `view_count`.
 * Later: swap this function to read from analytics / real tracking.
 */
export function getEpisodeDisplayViewCount(
  source: EpisodeViewCountSource
): number | null {
  if (source.display_view_count != null) {
    return source.display_view_count;
  }
  if (source.view_count != null && source.view_count > 0) {
    return source.view_count;
  }
  return null;
}
