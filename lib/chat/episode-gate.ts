/** Episode-gated knowledge helpers for AI character chat. */

export type EpisodeKnowledgeMap = Record<string, unknown>;

/**
 * Keep only episode_knowledge entries whose key (episode number) is
 * <= unlockedThroughEpisode. Later episodes are never injected into prompts.
 */
export function filterEpisodeKnowledge(
  episodeKnowledge: EpisodeKnowledgeMap | null | undefined,
  unlockedThroughEpisode: number
): Record<string, string> {
  const source = episodeKnowledge ?? {};
  const gated: Record<string, string> = {};

  for (const [key, value] of Object.entries(source)) {
    const episodeNum = Number(key);
    if (!Number.isFinite(episodeNum) || episodeNum > unlockedThroughEpisode) {
      continue;
    }
    if (value == null) continue;
    gated[key] = typeof value === "string" ? value : JSON.stringify(value);
  }

  return gated;
}

/**
 * Highest episode the user has meaningfully watched in a series.
 * Prefer completed episodes; also count progress > 30s as watched.
 */
export function resolveUnlockedEpisode(params: {
  history: Array<{
    episode_number: number;
    completed: boolean;
    progress_seconds: number;
  }>;
  /** Episode the viewer opened chat from (optional floor). */
  currentEpisodeNumber?: number | null;
}): number {
  let max = 0;
  for (const row of params.history) {
    if (row.completed || row.progress_seconds > 30) {
      max = Math.max(max, row.episode_number);
    }
  }
  if (params.currentEpisodeNumber != null && params.currentEpisodeNumber > 0) {
    max = Math.max(max, params.currentEpisodeNumber);
  }
  return max;
}
