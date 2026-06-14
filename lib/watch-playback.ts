export const AUDIO_UNMUTED_KEY = "reelwalia.audio.unmuted";
export const WATCH_USER_INITIATED_KEY = "reelwalia.watch.user-initiated";

/** User tapped an episode — prime unmuted intent before client navigation. */
export function markWatchNavigation(): void {
  try {
    sessionStorage.setItem(WATCH_USER_INITIATED_KEY, String(Date.now()));
  } catch {
    // private mode
  }
}

export function watchEpisodeHref(episodeId: string): string {
  return `/watch/${episodeId}?autoplay=true`;
}

export function shouldAutoStartWatch(unlocked: boolean, hasVideo: boolean): boolean {
  return unlocked && hasVideo;
}

export function readPreferUnmuted(): boolean {
  try {
    return sessionStorage.getItem(AUDIO_UNMUTED_KEY) === "true";
  } catch {
    return false;
  }
}

/** Recent episode-list tap → try unmuted once (consumes the flag). */
export function consumeUnmutedIntent(): boolean {
  try {
    if (sessionStorage.getItem(AUDIO_UNMUTED_KEY) === "true") return true;
    const ts = sessionStorage.getItem(WATCH_USER_INITIATED_KEY);
    if (!ts) return false;
    sessionStorage.removeItem(WATCH_USER_INITIATED_KEY);
    return Date.now() - Number(ts) < 5000;
  } catch {
    return false;
  }
}

export function persistAudioPreference(unmuted: boolean): void {
  try {
    if (unmuted) {
      sessionStorage.setItem(AUDIO_UNMUTED_KEY, "true");
    } else {
      sessionStorage.removeItem(AUDIO_UNMUTED_KEY);
    }
  } catch {
    // private mode
  }
}
