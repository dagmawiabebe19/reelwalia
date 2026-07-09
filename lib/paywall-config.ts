/**
 * Config-driven paywall/marketing values.
 *
 * These are display + copy knobs; the *actual* charge for the one-time unlock
 * is set by the Stripe price (STRIPE_PRICE_SERIES_UNLOCK). Keep the display
 * price here in sync with the amount you configure on that Stripe price.
 *
 * NEXT_PUBLIC_* vars are inlined at build time and safe to read on the client.
 */

const DEFAULT_SERIES_UNLOCK_PRICE = 2.99;
const DEFAULT_SOCIAL_PROOF_COUNT = 1300;

function parseNumberEnv(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** One-time "unlock all episodes" display price (USD). */
export function getSeriesUnlockPrice(): number {
  return parseNumberEnv(
    process.env.NEXT_PUBLIC_SERIES_UNLOCK_PRICE,
    DEFAULT_SERIES_UNLOCK_PRICE
  );
}

export function formatSeriesUnlockPrice(): string {
  return `$${getSeriesUnlockPrice().toFixed(2)}`;
}

/** Social-proof headcount shown as "Join N+ watching". */
export function getSocialProofCount(): number {
  return Math.round(
    parseNumberEnv(
      process.env.NEXT_PUBLIC_SOCIAL_PROOF_COUNT,
      DEFAULT_SOCIAL_PROOF_COUNT
    )
  );
}

export function formatSocialProofCount(): string {
  return getSocialProofCount().toLocaleString("en-US");
}

/** Generic fallback used when a series/episode has no cliffhanger_hook set. */
export const GENERIC_CLIFFHANGER_HOOK =
  "The story's just getting started. Don't stop now.";
