export interface WatchHistoryProgress {
  progress_seconds: number | null;
  completed: boolean | null;
}

/**
 * Binge navigation (?autoplay=true) always starts at 0.
 * Manual visits resume only incomplete episodes.
 */
export function resolveInitialProgress(
  history: WatchHistoryProgress | null | undefined,
  isBingeNavigation: boolean
): number {
  if (isBingeNavigation || !history || history.completed) {
    return 0;
  }
  const progress = history.progress_seconds ?? 0;
  return progress > 0 ? progress : 0;
}
