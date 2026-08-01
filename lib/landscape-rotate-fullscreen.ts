import screenfull from "screenfull";

type WebkitVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
  webkitSupportsFullscreen?: boolean;
};

export type FullscreenPath =
  | "native-ios"
  | "native-requestFullscreen"
  | "css-fallback"
  | "exit";

function fsLog(
  path: FullscreenPath,
  detail?: Record<string, unknown>
): void {
  // On-device debug: filter console by [rw-fs]
  console.info("[rw-fs]", path, {
    ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
    ...detail,
  });
}

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
  const result = await enterPlayerFullscreen(video, container);
  return result !== "none";
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

function applyCssFullscreenClasses(): void {
  document.body.classList.add("player-fullscreen", "player-css-fullscreen");
}

function clearFullscreenClasses(): void {
  document.body.classList.remove("player-fullscreen", "player-css-fullscreen");
}

function applyNativeFullscreenClass(): void {
  document.body.classList.add("player-fullscreen");
  document.body.classList.remove("player-css-fullscreen");
}

/** Wait until WebKit reports native video fullscreen (or timeout). */
function waitForWebkitFullscreen(
  video: HTMLVideoElement,
  timeoutMs: number
): Promise<boolean> {
  const webkitVideo = asWebkitVideo(video);
  if (webkitVideo.webkitDisplayingFullscreen) return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      video.removeEventListener("webkitbeginfullscreen", onBegin);
      window.clearTimeout(timer);
      resolve(ok);
    };
    const onBegin = () => done(true);
    const timer = window.setTimeout(() => {
      done(!!webkitVideo.webkitDisplayingFullscreen);
    }, timeoutMs);
    video.addEventListener("webkitbeginfullscreen", onBegin);
  });
}

/**
 * Cross-browser enter:
 * - iOS Safari: video.webkitEnterFullscreen() synchronously (user-gesture safe),
 *   then verify it actually entered — otherwise report "none" for CSS fallback.
 * - Android/desktop: Screenfull on the player container (video + controls only).
 */
export async function enterPlayerFullscreen(
  video: HTMLVideoElement,
  container: HTMLElement
): Promise<"webkit" | "screenfull" | "none"> {
  const webkitVideo = asWebkitVideo(video);

  // --- iOS / WebKit native video fullscreen ---
  if (isIOSDevice() && typeof webkitVideo.webkitEnterFullscreen === "function") {
    if (video.readyState < 1) {
      fsLog("css-fallback", {
        reason: "video-not-ready",
        readyState: video.readyState,
      });
      return "none";
    }

    // Prefer playing — some iOS versions no-op FS on a paused video
    if (video.paused) {
      try {
        void video.play();
      } catch {
        // Non-blocking; still attempt FS
      }
    }

    try {
      // MUST stay synchronous with the user gesture (no await before this call)
      webkitVideo.webkitEnterFullscreen();
    } catch (err) {
      fsLog("css-fallback", {
        reason: "webkit-throw",
        error: err instanceof Error ? err.message : String(err),
      });
      return "none";
    }

    const ok = await waitForWebkitFullscreen(video, 500);
    if (ok) {
      fsLog("native-ios", { readyState: video.readyState });
      return "webkit";
    }

    fsLog("css-fallback", {
      reason: "webkit-noop",
      readyState: video.readyState,
      displaying: !!webkitVideo.webkitDisplayingFullscreen,
    });
    return "none";
  }

  // --- Standard Fullscreen API via screenfull (Android / desktop) ---
  if (screenfull.isEnabled) {
    try {
      if (!screenfull.isFullscreen || screenfull.element !== container) {
        await screenfull.request(container);
      }
      fsLog("native-requestFullscreen", {
        element: container.tagName,
        className: container.className.slice(0, 80),
      });
      return "screenfull";
    } catch (err) {
      fsLog("css-fallback", {
        reason: "screenfull-throw",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Non-iOS WebKit that still exposes webkitEnterFullscreen
  if (typeof webkitVideo.webkitEnterFullscreen === "function" && video.readyState >= 1) {
    try {
      webkitVideo.webkitEnterFullscreen();
      const ok = await waitForWebkitFullscreen(video, 500);
      if (ok) {
        fsLog("native-ios", { reason: "non-ios-webkit" });
        return "webkit";
      }
    } catch {
      // fall through
    }
  }

  fsLog("css-fallback", {
    reason: "no-native-api",
    screenfullEnabled: screenfull.isEnabled,
    hasWebkit: typeof webkitVideo.webkitEnterFullscreen === "function",
  });
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

  clearFullscreenClasses();
  fsLog("exit");
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
    return { mode: "exit", custom: false };
  }

  const entered = await enterPlayerFullscreen(video, container);
  if (entered === "webkit" || entered === "screenfull") {
    applyNativeFullscreenClass();
    return { mode: entered, custom: false };
  }

  // CSS fallback: fixed player + hide all page chrome via body.player-css-fullscreen
  applyCssFullscreenClasses();
  fsLog("css-fallback", { reason: "applied-css-classes" });
  return { mode: "custom", custom: true };
}
