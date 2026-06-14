export interface EpisodeListItem {
  id: string;
  episode_number: number;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
}

export function getNextEpisode<T extends EpisodeListItem>(
  episodes: T[],
  currentEpisodeId: string
): T | null {
  const index = episodes.findIndex((ep) => ep.id === currentEpisodeId);
  if (index < 0 || index >= episodes.length - 1) return null;
  return episodes[index + 1];
}
