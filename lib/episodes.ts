export interface EpisodeListItem {
  id: string;
  episode_number: number;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
}

function sortByEpisodeNumber<T extends EpisodeListItem>(episodes: T[]): T[] {
  return [...episodes].sort((a, b) => a.episode_number - b.episode_number);
}

export function getNextEpisode<T extends EpisodeListItem>(
  episodes: T[],
  currentEpisodeId: string
): T | null {
  const sorted = sortByEpisodeNumber(episodes);
  const index = sorted.findIndex((ep) => ep.id === currentEpisodeId);
  if (index < 0 || index >= sorted.length - 1) return null;
  return sorted[index + 1];
}

export function getEpisodeByNumber<T extends EpisodeListItem>(
  episodes: T[],
  episodeNumber: number
): T | null {
  const sorted = sortByEpisodeNumber(episodes);
  return sorted.find((ep) => ep.episode_number === episodeNumber) ?? null;
}
