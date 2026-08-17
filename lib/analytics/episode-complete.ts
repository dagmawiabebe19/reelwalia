/** Fire "complete" once the viewer reaches this fraction of runtime (timeupdate + ended). */
export const EPISODE_COMPLETE_THRESHOLD = 0.9;

export function isEpisodeWatchComplete(
  currentTime: number,
  durationSeconds: number,
  threshold = EPISODE_COMPLETE_THRESHOLD
): boolean {
  if (!Number.isFinite(currentTime) || currentTime <= 0) return false;
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds === Infinity) {
    return false;
  }
  return currentTime >= durationSeconds * threshold;
}

/** Prefer a finite positive duration from live element vs. React state. */
export function resolvePlaybackDuration(
  liveDuration: number,
  stateDuration: number
): number {
  if (Number.isFinite(liveDuration) && liveDuration > 0 && liveDuration !== Infinity) {
    return liveDuration;
  }
  if (Number.isFinite(stateDuration) && stateDuration > 0 && stateDuration !== Infinity) {
    return stateDuration;
  }
  return 0;
}
