import screenfull from "screenfull";

type WebkitVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
  webkitSupportsFullscreen?: boolean;
};

export function isMobileViewport(): boolean {
  return window.matchMedia("(max-width: 768px)").matches;
}

export function isDeviceLandscape(): boolean {
  return window.innerWidth > window.innerHeight;
}

export function isIOSDevice(): boolean {
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isNativeVideoFullscreen(video: HTMLVideoElement): boolean {
  return !!(video as WebkitVideo).webkitDisplayingFullscreen;
}

function asWebkitVideo(video: HTMLVideoElement): WebkitVideo {
  return video as WebkitVideo;
}

export function canUseWebkitVideoFullscreen(video: HTMLVideoElement): boolean {
  const webkitVideo = asWebkitVideo(video);
  return typeof webkitVideo.webkitEnterFullscreen === "function";
}

export function canAutoRotateFullscreen(video: HTMLVideoElement): boolean {
  if (isIOSDevice()) {
    return canUseWebkitVideoFullscreen(video);
  }
  return screenfull.isEnabled;
}

export async function enterLandscapeRotateFullscreen(
  video: HTMLVideoElement,
  container: HTMLElement
): Promise<boolean> {
  return (await enterPlayerFullscreen(video, container)) !== "none";
}

export async function exitLandscapeRotateFullscreen(
  video: HTMLVideoElement,
  container: HTMLElement
): Promise<void> {
  await exitPlayerFullscreen(video, container);
}

export function isLandscapeRotateFullscreenActive(
  video: HTMLVideoElement,
  container: HTMLElement
): boolean {
  return isPlayerFullscreenActive(video, container);
}

/** True if native video FS, Screenfull FS, or custom CSS FS is active. */
export function isPlayerFullscreenActive(
  video: HTMLVideoElement,
  container: HTMLElement,
  customFullscreen = false
): boolean {
  if (customFullscreen) return true;
  if (isNativeVideoFullscreen(video)) return true;
  return screenfull.isEnabled && screenfull.isFullscreen && screenfull.element === container;
}

/**
 * Cross-browser enter:
 * - iOS Safari: video.webkitEnterFullscreen() (container Fullscreen API does not work)
 * - Android/desktop: Screenfull on the player container
 * - Fallback: caller applies custom CSS fullscreen
 */
export async function enterPlayerFullscreen(
  video: HTMLVideoElement,
  container: HTMLElement
): Promise<"webkit" | "screenfull" | "none"> {
  const webkitVideo = asWebkitVideo(video);

  // Prefer native video fullscreen on iOS (container Fullscreen API does not work there)
  if (isIOSDevice() && typeof webkitVideo.webkitEnterFullscreen === "function") {
    try {
      webkitVideo.webkitEnterFullscreen();
      return "webkit";
    } catch {
      // fall through
    }
  }

  if (screenfull.isEnabled) {
    try {
      if (!screenfull.isFullscreen || screenfull.element !== container) {
        await screenfull.request(container);
      }
      return "screenfull";
    } catch {
      // fall through
    }
  }

  // Non-iOS WebKit oddities
  if (typeof webkitVideo.webkitEnterFullscreen === "function") {
    try {
      webkitVideo.webkitEnterFullscreen();
      return "webkit";
    } catch {
      return "none";
    }
  }

  return "none";
}

export async function exitPlayerFullscreen(
  video: HTMLVideoElement,
  container: HTMLElement
): Promise<void> {
  const webkitVideo = asWebkitVideo(video);

  try {
    if (screenfull.isEnabled && screenfull.isFullscreen) {
      await screenfull.exit();
    }
  } catch {
    // Non-blocking
  }

  if (
    webkitVideo.webkitDisplayingFullscreen &&
    typeof webkitVideo.webkitExitFullscreen === "function"
  ) {
    try {
      webkitVideo.webkitExitFullscreen();
    } catch {
      // Already exiting
    }
  }
}

/**
 * Toggle fullscreen with the correct API per platform.
 * Returns how fullscreen is represented so the UI can sync custom CSS fallback.
 */
export async function togglePlayerFullscreen(
  video: HTMLVideoElement,
  container: HTMLElement,
  customFullscreen: boolean
): Promise<{ mode: "webkit" | "screenfull" | "custom" | "exit"; custom: boolean }> {
  const active = isPlayerFullscreenActive(video, container, customFullscreen);

  if (active) {
    await exitPlayerFullscreen(video, container);
    document.body.classList.remove("player-fullscreen");
    return { mode: "exit", custom: false };
  }

  const entered = await enterPlayerFullscreen(video, container);
  if (entered === "webkit" || entered === "screenfull") {
    document.body.classList.add("player-fullscreen");
    return { mode: entered, custom: false };
  }

  // Last resort: CSS fixed fullscreen (rare WebViews without FS APIs)
  document.body.classList.add("player-fullscreen");
  return { mode: "custom", custom: true };
}
