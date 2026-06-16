import screenfull from "screenfull";

type WebkitVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
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

export function canAutoRotateFullscreen(video: HTMLVideoElement): boolean {
  const webkitVideo = video as WebkitVideo;
  if (isIOSDevice()) {
    return typeof webkitVideo.webkitEnterFullscreen === "function";
  }
  return screenfull.isEnabled;
}

export async function enterLandscapeRotateFullscreen(
  video: HTMLVideoElement,
  container: HTMLElement
): Promise<boolean> {
  const webkitVideo = video as WebkitVideo;

  if (isIOSDevice()) {
    if (typeof webkitVideo.webkitEnterFullscreen !== "function") {
      return false;
    }
    try {
      webkitVideo.webkitEnterFullscreen();
      return true;
    } catch {
      return false;
    }
  }

  if (!screenfull.isEnabled) {
    return false;
  }

  try {
    await screenfull.request(container);
    return true;
  } catch {
    return false;
  }
}

export async function exitLandscapeRotateFullscreen(
  video: HTMLVideoElement,
  container: HTMLElement
): Promise<void> {
  const webkitVideo = video as WebkitVideo;

  try {
    if (screenfull.isEnabled && screenfull.isFullscreen && screenfull.element === container) {
      await screenfull.exit();
    }
  } catch {
    // Non-blocking
  }

  if (webkitVideo.webkitDisplayingFullscreen && typeof webkitVideo.webkitExitFullscreen === "function") {
    try {
      webkitVideo.webkitExitFullscreen();
    } catch {
      // iOS may already be exiting due to rotation
    }
  }
}

export function isLandscapeRotateFullscreenActive(
  video: HTMLVideoElement,
  container: HTMLElement
): boolean {
  if (isNativeVideoFullscreen(video)) {
    return true;
  }
  return screenfull.isEnabled && screenfull.isFullscreen && screenfull.element === container;
}
