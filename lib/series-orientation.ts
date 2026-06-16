export type SeriesOrientation = "vertical" | "landscape";

export const DEFAULT_SERIES_ORIENTATION: SeriesOrientation = "vertical";

export function normalizeSeriesOrientation(
  value: string | null | undefined
): SeriesOrientation {
  return value === "landscape" ? "landscape" : "vertical";
}
