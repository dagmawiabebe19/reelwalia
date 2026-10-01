/**
 * Pure entitlement rules — no I/O, so they can be unit-tested exhaustively.
 *
 * Stripe (international, auto-renewing):
 *   - profiles.subscription_status active | trialing            → access
 *   - subscriptions row (provider stripe) active | trialing | canceled
 *     with current_period_end > now                              → access
 *     (cancelled subscriptions keep the time already paid for)
 *   - past_due / unpaid / none, or any row whose period has ended → no access
 *     (past_due means the renewal charge failed: the paid period is over)
 *
 * Chapa (Ethiopia, one-time passes):
 *   - subscriptions row (provider chapa) active with current_period_end > now → access
 *   - expired / canceled (refunded) / active-but-past-end                   → no access
 */

export type ProviderName = "stripe" | "chapa";

export interface EntitlementRow {
  id: string;
  provider: string | null;
  status: string;
  plan?: string | null;
  current_period_end: string | null;
}

export const STRIPE_PROFILE_GRANTING_STATUSES = ["active", "trialing"] as const;
export const STRIPE_ROW_GRANTING_STATUSES = ["active", "trialing", "canceled"] as const;
export const CHAPA_ROW_GRANTING_STATUSES = ["active"] as const;

export interface AccessDecision {
  active: boolean;
  /** Which provider grants access (Stripe wins if both). */
  provider: ProviderName | null;
  stripe: {
    active: boolean;
    /** Granted only by a cancelled subscription's remaining paid period. */
    canceledWithTimeLeft: boolean;
    periodEnd: string | null;
  };
  chapa: {
    active: boolean;
    periodEnd: string | null;
    plan: string | null;
  };
  /** Chapa rows still marked active whose period has ended — flip to 'expired'. */
  chapaRowsToExpire: string[];
}

function endMs(row: EntitlementRow): number {
  return row.current_period_end ? Date.parse(row.current_period_end) : NaN;
}

function inPeriod(row: EntitlementRow, nowMs: number): boolean {
  const end = endMs(row);
  return Number.isFinite(end) && end > nowMs;
}

function includes(list: readonly string[], value: string | null | undefined): boolean {
  return value != null && list.includes(value);
}

export function evaluateAccess(input: {
  profileStatus: string | null | undefined;
  rows: EntitlementRow[];
  nowMs?: number;
}): AccessDecision {
  const nowMs = input.nowMs ?? Date.now();
  const stripeRows = input.rows.filter((r) => (r.provider ?? "stripe") === "stripe");
  const chapaRows = input.rows.filter((r) => r.provider === "chapa");

  const profileGrants = includes(STRIPE_PROFILE_GRANTING_STATUSES, input.profileStatus);
  const grantingStripeRow = stripeRows
    .filter((r) => includes(STRIPE_ROW_GRANTING_STATUSES, r.status) && inPeriod(r, nowMs))
    .sort((a, b) => endMs(b) - endMs(a))[0];
  const stripeActive = profileGrants || Boolean(grantingStripeRow);

  const latestChapa = [...chapaRows].sort((a, b) => {
    const diff = (endMs(b) || 0) - (endMs(a) || 0);
    return diff;
  })[0];
  const chapaActive = chapaRows.some(
    (r) => includes(CHAPA_ROW_GRANTING_STATUSES, r.status) && inPeriod(r, nowMs)
  );
  const chapaRowsToExpire = chapaRows
    .filter((r) => r.status === "active" && !inPeriod(r, nowMs))
    .map((r) => r.id);

  return {
    active: stripeActive || chapaActive,
    provider: stripeActive ? "stripe" : chapaActive ? "chapa" : null,
    stripe: {
      active: stripeActive,
      canceledWithTimeLeft: !profileGrants && grantingStripeRow?.status === "canceled",
      periodEnd: grantingStripeRow?.current_period_end ?? null,
    },
    chapa: {
      active: chapaActive,
      periodEnd: latestChapa?.current_period_end ?? null,
      plan: latestChapa?.plan ?? null,
    },
    chapaRowsToExpire,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * New Chapa pass end after a verified payment. Mirrors grant_chapa_entitlement
 * (migration 033): GREATEST(now, current end if still active) + period_days.
 * An active pass stacks forward; an expired/ended pass renews from now.
 */
export function computeChapaPeriodEnd(input: {
  currentStatus: string | null | undefined;
  currentPeriodEnd: string | null | undefined;
  periodDays: number;
  nowMs?: number;
}): Date {
  if (!Number.isFinite(input.periodDays) || input.periodDays <= 0) {
    throw new Error("periodDays must be positive");
  }
  const nowMs = input.nowMs ?? Date.now();
  const currentEnd = input.currentPeriodEnd ? Date.parse(input.currentPeriodEnd) : NaN;
  const base =
    input.currentStatus === "active" && Number.isFinite(currentEnd)
      ? Math.max(nowMs, currentEnd)
      : nowMs;
  return new Date(base + input.periodDays * DAY_MS);
}
