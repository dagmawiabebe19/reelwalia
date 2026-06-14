/** Shared production mark geometry — single source of truth. */
export const BRAND_MARK_VIEWBOX = "0 0 48 48";
export const BRAND_RED = "#E03C2F";

/** Selected mark: Red Stream Pod — bold 9:16 capsule, white play hero. */
export const PRODUCTION_MARK = {
  id: "red-stream-pod",
  label: "Red Stream Pod (selected)",
  description:
    "Filled vertical capsule with hero white play. Reads as video first, mobile second. Strong at 16px.",
  phone: { x: 11, y: 2, width: 26, height: 44, rx: 9 },
  play: "M19 13L19 35L37 24Z",
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
