/** Shared production mark geometry — single source of truth. */
export const BRAND_MARK_VIEWBOX = "0 0 48 48";
export const BRAND_RED = "#E03C2F";
export const BRAND_RED_LIGHT = "#FF6B5E";
export const BRAND_RED_DARK = "#9E261D";

/** Premium glossy stream pod — generous padding, hero play, optical center. */
export const MARK_FRAME = {
  x: 8,
  y: 2,
  width: 32,
  height: 44,
  rx: 10,
} as const;

/**
 * Play triangle — hero element with balanced inset (~18% horizontal padding).
 * Optically centered 0.5px above geometric midline.
 */
export const MARK_PLAY = "M18.5 14.5L18.5 33.5L35 24Z";

/** @deprecated Use MARK_FRAME + MARK_PLAY */
export const PRODUCTION_MARK = {
  id: "red-stream-pod-premium",
  label: "Red Stream Pod Premium",
  description: "Glossy 3D capsule with hero white play.",
  phone: MARK_FRAME,
  play: MARK_PLAY,
} as const;

export type LogoConceptId =
  | "wireframe-v1"
  | "hero-play-frame"
  | "red-stream-pod"
  | "play-cutout"
  | "play-body"
  | "continuous-silhouette"
  | "floating-premium"
  | "minimal-ios"
  | "film-hybrid"
  | "thick-frame"
  | "layered-depth"
  | "squircle-device"
  | "play-first"
  | "split-tone"
  | "cinema-vertical";

export interface LogoConcept {
  id: LogoConceptId;
  label: string;
  description: string;
  selected?: boolean;
}
