/**
 * Abbreviates a view count for display (e.g. 425000 → "425K", 1200000 → "1.2M").
 * Returns null for null, undefined, or 0 — callers should hide the label.
 */
export function formatViewCount(
  n: number | null | undefined
): string | null {
  if (n == null || n <= 0) return null;

  if (n >= 1_000_000) {
    const millions = n / 1_000_000;
    if (Number.isInteger(millions)) {
      return `${millions}M`;
    }
    return `${parseFloat(millions.toFixed(1))}M`;
  }

  if (n >= 1_000) {
    return `${Math.round(n / 1_000)}K`;
  }

  return String(n);
}
