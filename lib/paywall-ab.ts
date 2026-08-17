/** Paywall position A/B test — Group A after ep 1, B after ep 2, C after ep 3. */

export const PAYWALL_VARIANT_AFTER_1 = "paywall_after_1";
export const PAYWALL_VARIANT_AFTER_2 = "paywall_after_2";
export const PAYWALL_VARIANT_AFTER_3 = "paywall_after_3";

export type PaywallVariant =
  | typeof PAYWALL_VARIANT_AFTER_1
  | typeof PAYWALL_VARIANT_AFTER_2
  | typeof PAYWALL_VARIANT_AFTER_3;

export const PAYWALL_AB_COOKIE = "rw_paywall_ab";

/**
 * Flip `enabled` to stop assigning NEW visitors. Existing buckets stay sticky.
 * `weightA` / `weightB` are shares for Groups A and B; Group C gets the remainder.
 * Default 1/3 each.
 */
export const PAYWALL_AB_CONFIG = {
  enabled: true,
  weightA: 1 / 3,
  weightB: 1 / 3,
} as const;

export const VARIANT_FREE_EPISODE_COUNT: Record<PaywallVariant, number> = {
  [PAYWALL_VARIANT_AFTER_1]: 1,
  [PAYWALL_VARIANT_AFTER_2]: 2,
  [PAYWALL_VARIANT_AFTER_3]: 3,
};

export const VARIANT_LABELS: Record<PaywallVariant, string> = {
  [PAYWALL_VARIANT_AFTER_1]: "Group A — paywall after episode 1",
  [PAYWALL_VARIANT_AFTER_2]: "Group B — paywall after episode 2",
  [PAYWALL_VARIANT_AFTER_3]: "Group C — paywall after episode 3",
};

const COOKIE_PREFIX = "v1";

export type PaywallAbCookie = {
  visitorId: string;
  variant: PaywallVariant;
};

export function isPaywallVariant(value: string | null | undefined): value is PaywallVariant {
  return (
    value === PAYWALL_VARIANT_AFTER_1 ||
    value === PAYWALL_VARIANT_AFTER_2 ||
    value === PAYWALL_VARIANT_AFTER_3
  );
}

export function pickPaywallVariant(random = Math.random()): PaywallVariant {
  const weightA = Math.min(1, Math.max(0, PAYWALL_AB_CONFIG.weightA));
  const weightB = Math.min(1 - weightA, Math.max(0, PAYWALL_AB_CONFIG.weightB));
  if (random < weightA) return PAYWALL_VARIANT_AFTER_1;
  if (random < weightA + weightB) return PAYWALL_VARIANT_AFTER_2;
  return PAYWALL_VARIANT_AFTER_3;
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
