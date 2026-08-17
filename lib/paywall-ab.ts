/** Paywall position A/B test — Group A after ep 1, Group B after ep 2 (current default). */

export const PAYWALL_VARIANT_AFTER_1 = "paywall_after_1";
export const PAYWALL_VARIANT_AFTER_2 = "paywall_after_2";

export type PaywallVariant =
  | typeof PAYWALL_VARIANT_AFTER_1
  | typeof PAYWALL_VARIANT_AFTER_2;

export const PAYWALL_AB_COOKIE = "rw_paywall_ab";

/**
 * Flip `enabled` to stop assigning NEW visitors. Existing buckets stay sticky.
 * `weightA` is the share of new users in Group A (after episode 1).
 * 0.5 = 50/50, 0 = all B, 1 = all A.
 */
export const PAYWALL_AB_CONFIG = {
  enabled: true,
  weightA: 0.5,
} as const;

export const VARIANT_FREE_EPISODE_COUNT: Record<PaywallVariant, number> = {
  [PAYWALL_VARIANT_AFTER_1]: 1,
  [PAYWALL_VARIANT_AFTER_2]: 2,
};

export const VARIANT_LABELS: Record<PaywallVariant, string> = {
  [PAYWALL_VARIANT_AFTER_1]: "Group A — paywall after episode 1",
  [PAYWALL_VARIANT_AFTER_2]: "Group B — paywall after episode 2",
};

const COOKIE_PREFIX = "v1";

export type PaywallAbCookie = {
  visitorId: string;
  variant: PaywallVariant;
};

export function isPaywallVariant(value: string | null | undefined): value is PaywallVariant {
  return value === PAYWALL_VARIANT_AFTER_1 || value === PAYWALL_VARIANT_AFTER_2;
}

export function pickPaywallVariant(random = Math.random()): PaywallVariant {
  const weight = Math.min(1, Math.max(0, PAYWALL_AB_CONFIG.weightA));
  return random < weight ? PAYWALL_VARIANT_AFTER_1 : PAYWALL_VARIANT_AFTER_2;
}

export function freeEpisodeCountForVariant(variant: PaywallVariant): number {
  return VARIANT_FREE_EPISODE_COUNT[variant];
}

export function serializePaywallAbCookie(value: PaywallAbCookie): string {
  return `${COOKIE_PREFIX}.${value.visitorId}.${value.variant}`;
}

export function parsePaywallAbCookie(raw: string | undefined | null): PaywallAbCookie | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3 || parts[0] !== COOKIE_PREFIX) return null;
  const visitorId = parts[1];
  const variant = parts[2];
  if (!visitorId || visitorId.length < 8 || !isPaywallVariant(variant)) return null;
  return { visitorId, variant };
}

export function paywallAbCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  };
}

/** New accounts only: adopt anonymous cookie onto profile. */
export const PAYWALL_AB_SIGNUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function isNewAccountForPaywallAb(createdAt: string | null | undefined, now = Date.now()): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now - created <= PAYWALL_AB_SIGNUP_WINDOW_MS;
}
