import screenfull from "screenfull";

type WebkitVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
  webkitSupportsFullscreen?: boolean;
  webkitSetPresentationMode?: (
    mode: "inline" | "fullscreen" | "picture-in-picture"
  ) => void;
  webkitPresentationMode?: "inline" | "fullscreen" | "picture-in-picture";
};

export type FullscreenPath =
  | "native-ios"
  | "native-requestFullscreen"
  | "css-fallback"
  | "exit"
  | "attempt-native-ios";

type FsReturnSlot = {
  parent: Node;
  next: ChildNode | null;
};

const FS_RETURN = "__rwFsReturn";

export function fsLog(
  path: FullscreenPath,
  detail?: Record<string, unknown>
): void {
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
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  if (
    /Apple Computer/.test(navigator.vendor) &&
    "ontouchend" in document &&
    /Safari/i.test(ua) &&
    !/Chrome|CriOS|FxiOS|EdgiOS/i.test(ua)
  ) {
    return true;
  }
  return false;
}

export function isNativeVideoFullscreen(video: HTMLVideoElement): boolean {
  const v = video as WebkitVideo;
  return !!(v.webkitDisplayingFullscreen || v.webkitPresentationMode === "fullscreen");
}

function asWebkitVideo(video: HTMLVideoElement): WebkitVideo {
  return video as WebkitVideo;
}

export function canUseWebkitVideoFullscreen(video: HTMLVideoElement): boolean {
  const v = asWebkitVideo(video);
  return (
    typeof v.webkitEnterFullscreen === "function" ||
    typeof v.webkitSetPresentationMode === "function"
  );
}

export function canAutoRotateFullscreen(video: HTMLVideoElement): boolean {
  if (canUseWebkitVideoFullscreen(video)) return true;
  return screenfull.isEnabled;
}

export async function enterLandscapeRotateFullscreen(
  video: HTMLVideoElement,
  container: HTMLElement
): Promise<boolean> {
  return tryEnterNativeVideoFullscreen(video) || (await tryEnterScreenfull(container));
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

export function isPlayerFullscreenActive(
  video: HTMLVideoElement,
  container: HTMLElement,
  customFullscreen = false
): boolean {
  if (customFullscreen) return true;
  if (isNativeVideoFullscreen(video)) return true;
  return screenfull.isEnabled && screenfull.isFullscreen && screenfull.element === container;
}

export function applyCssFullscreenClasses(): void {
  document.documentElement.classList.add("player-css-fullscreen");
  document.body.classList.add("player-fullscreen", "player-css-fullscreen");
}

export function clearFullscreenClasses(): void {
  document.documentElement.classList.remove("player-css-fullscreen");
  document.body.classList.remove("player-fullscreen", "player-css-fullscreen");
}

export function applyNativeFullscreenClass(): void {
  document.documentElement.classList.remove("player-css-fullscreen");
  document.body.classList.add("player-fullscreen");
  document.body.classList.remove("player-css-fullscreen");
}

/**
 * Relocate the player container under document.body so position:fixed / z-index
 * are not trapped by the feed scroller's overflow stacking context.
 * Same DOM node → video keeps playing (no React remount).
 */
export function relocatePlayerToBody(container: HTMLElement): void {
  if (container.parentElement === document.body) return;
  if (!container.parentNode) return;
  const slot: FsReturnSlot = {
    parent: container.parentNode,
    next: container.nextSibling,
  };
  (container as unknown as Record<string, FsReturnSlot>)[FS_RETURN] = slot;
  container.setAttribute("data-rw-fs-portal", "1");
  document.body.appendChild(container);
}

export function restorePlayerFromBody(container: HTMLElement): void {
  const slot = (container as unknown as Record<string, FsReturnSlot | undefined>)[FS_RETURN];
  if (!slot?.parent) {
    container.removeAttribute("data-rw-fs-portal");
    return;
  }
  try {
    if (slot.next && slot.next.parentNode === slot.parent) {
      slot.parent.insertBefore(container, slot.next);
    } else {
      slot.parent.appendChild(container);
    }
  } catch {
    slot.parent.appendChild(container);
  }
  delete (container as unknown as Record<string, unknown>)[FS_RETURN];
  container.removeAttribute("data-rw-fs-portal");
}

export function enterCssFullscreenPortal(container: HTMLElement, reason: string): void {
  relocatePlayerToBody(container);
  applyCssFullscreenClasses();
  fsLog("css-fallback", { reason });
}

/**
 * SYNCHRONOUS native iOS / WebKit fullscreen.
 * Must run in the same turn as the tap handler (do not await before this).
 * Does NOT gate on readyState — calling webkitEnterFullscreen when not ready
 * throws (caught); gating previously forced css-fallback on false negatives.
 */
export function tryEnterNativeVideoFullscreen(video: HTMLVideoElement): boolean {
  const v = asWebkitVideo(video);
  const hasEnter = typeof v.webkitEnterFullscreen === "function";
  const hasPresentation = typeof v.webkitSetPresentationMode === "function";

  fsLog("attempt-native-ios", {
    readyState: video.readyState,
    paused: video.paused,
    networkState: video.networkState,
    tagName: video.tagName,
    currentSrc: (video.currentSrc || "").slice(0, 120),
    hasWebkitEnterFullscreen: hasEnter,
    hasWebkitSetPresentationMode: hasPresentation,
    webkitSupportsFullscreen: v.webkitSupportsFullscreen ?? null,
    webkitPresentationMode: v.webkitPresentationMode ?? null,
    isIOSDevice: isIOSDevice(),
  });

  if (!hasEnter && !hasPresentation) {
    fsLog("css-fallback", {
      reason: "no-webkit-api",
      readyState: video.readyState,
    });
    return false;
  }

  // Some iOS builds no-op FS while paused — kick play without awaiting
  if (video.paused) {
    try {
      void video.play();
    } catch {
      // Non-blocking
    }
  }

  try {
    // Prefer classic webkitEnterFullscreen (true OS fullscreen on iPhone)
    if (hasEnter) {
      v.webkitEnterFullscreen!();
      fsLog("native-ios", {
        via: "webkitEnterFullscreen",
        readyState: video.readyState,
        displaying: !!v.webkitDisplayingFullscreen,
      });
      return true;
    }

    v.webkitSetPresentationMode!("fullscreen");
    fsLog("native-ios", {
      via: "webkitSetPresentationMode",
      readyState: video.readyState,
      mode: v.webkitPresentationMode ?? null,
    });
    return true;
  } catch (err) {
    fsLog("css-fallback", {
      reason: "webkit-throw",
      readyState: video.readyState,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * After a sync native attempt: if WebKit never actually enters, apply CSS portal.
 * Returns a cancel function (call on unmount / exit).
 */
export function confirmNativeOrCssFallback(
  video: HTMLVideoElement,
  container: HTMLElement,
  onNative: () => void,
  onCss: () => void,
  timeoutMs = 700
): () => void {
  if (isNativeVideoFullscreen(video)) {
    applyNativeFullscreenClass();
    onNative();
    return () => undefined;
  }

  let settled = false;
  const finishNative = () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);
    video.removeEventListener("webkitbeginfullscreen", finishNative);
    video.removeEventListener("webkitpresentationmodechanged", onPresentation);
    applyNativeFullscreenClass();
    onNative();
  };

  const onPresentation = () => {
    if (isNativeVideoFullscreen(video)) finishNative();
  };

  const timer = window.setTimeout(() => {
    if (settled) return;
    if (isNativeVideoFullscreen(video)) {
      finishNative();
      return;
    }
    settled = true;
    video.removeEventListener("webkitbeginfullscreen", finishNative);
    video.removeEventListener("webkitpresentationmodechanged", onPresentation);
    enterCssFullscreenPortal(container, "webkit-noop");
    onCss();
  }, timeoutMs);

  video.addEventListener("webkitbeginfullscreen", finishNative);
  video.addEventListener("webkitpresentationmodechanged", onPresentation);

  return () => {
    settled = true;
    window.clearTimeout(timer);
    video.removeEventListener("webkitbeginfullscreen", finishNative);
    video.removeEventListener("webkitpresentationmodechanged", onPresentation);
  };
}

async function tryEnterScreenfull(container: HTMLElement): Promise<boolean> {
  if (!screenfull.isEnabled) return false;
  try {
    if (!screenfull.isFullscreen || screenfull.element !== container) {
      await screenfull.request(container);
    }
    fsLog("native-requestFullscreen", {
      element: container.tagName,
    });
    return true;
  } catch (err) {
    fsLog("css-fallback", {
      reason: "screenfull-throw",
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export async function enterPlayerFullscreen(
  video: HTMLVideoElement,
  container: HTMLElement
): Promise<"webkit" | "screenfull" | "none"> {
  if (tryEnterNativeVideoFullscreen(video)) {
    return "webkit";
  }

  if (await tryEnterScreenfull(container)) {
    return "screenfull";
  }

  fsLog("css-fallback", {
    reason: "no-native-api",
    readyState: video.readyState,
    screenfullEnabled: screenfull.isEnabled,
    hasWebkit: canUseWebkitVideoFullscreen(video),
  });
  return "none";
}

export async function exitPlayerFullscreen(
  video: HTMLVideoElement,
  container: HTMLElement
): Promise<void> {
  const v = asWebkitVideo(video);

  try {
    if (screenfull.isEnabled && screenfull.isFullscreen) {
      await screenfull.exit();
    }
  } catch {
    // Non-blocking
  }

  try {
    if (
      typeof v.webkitSetPresentationMode === "function" &&
      v.webkitPresentationMode === "fullscreen"
    ) {
      v.webkitSetPresentationMode("inline");
    }
  } catch {
    // Non-blocking
  }

  if (v.webkitDisplayingFullscreen && typeof v.webkitExitFullscreen === "function") {
    try {
      v.webkitExitFullscreen();
    } catch {
      // Already exiting
    }
  }

  restorePlayerFromBody(container);
  clearFullscreenClasses();
  fsLog("exit");
}

/**
 * Toggle fullscreen. Prefer calling tryEnterNativeVideoFullscreen synchronously
 * from the tap handler (see VideoPlayer) before this async helper.
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

  if (tryEnterNativeVideoFullscreen(video)) {
    applyNativeFullscreenClass();
    return { mode: "webkit", custom: false };
  }

  if (await tryEnterScreenfull(container)) {
    applyNativeFullscreenClass();
    return { mode: "screenfull", custom: false };
  }

  enterCssFullscreenPortal(container, "applied-css-portal");
  return { mode: "custom", custom: true };
}
