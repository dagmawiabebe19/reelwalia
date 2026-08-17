/** First-touch country attribution — ISO 3166-1 alpha-2 only. No IP, city, age, or gender. */

export const COUNTRY_GEO_COOKIE = "rw_country";
export const COUNTRY_UNKNOWN = "unknown";

/** Events before this deploy date have no country — show as unknown, never guessed. */
export const COUNTRY_GEO_ATTRIBUTION_START = "2026-08-17";

export const VERCEL_COUNTRY_HEADER = "x-vercel-ip-country";

export type CountryCode = string;

export type CountryGeoCookie = {
  visitorId: string;
  country: string;
};

const COOKIE_PREFIX = "v1";
const ISO_COUNTRY = /^[A-Z]{2}$/;

export function normalizeCountryCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  if (trimmed === COUNTRY_UNKNOWN) return COUNTRY_UNKNOWN;
  if (!ISO_COUNTRY.test(trimmed)) return null;
  return trimmed;
}

export function isKnownCountryCode(value: string | null | undefined): value is string {
  const normalized = normalizeCountryCode(value);
  return normalized != null && normalized !== COUNTRY_UNKNOWN;
}

export function countryFromRequestHeaders(
  headers: Headers | { get(name: string): string | null }
): string | null {
  const raw =
    headers.get(VERCEL_COUNTRY_HEADER) ??
    headers.get("X-Vercel-IP-Country") ??
    null;
  return normalizeCountryCode(raw);
}

export function serializeCountryGeoCookie(value: CountryGeoCookie): string {
  return `${COOKIE_PREFIX}.${value.visitorId}.${value.country}`;
}

export function parseCountryGeoCookie(raw: string | undefined | null): CountryGeoCookie | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3 || parts[0] !== COOKIE_PREFIX) return null;
  const visitorId = parts[1];
  const country = normalizeCountryCode(parts[2]);
  if (!visitorId || visitorId.length < 8 || !country || country === COUNTRY_UNKNOWN) {
    return null;
  }
  return { visitorId, country };
}

export function countryGeoCookieOptions(): {
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
export const COUNTRY_GEO_SIGNUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function isNewAccountForCountryGeo(
  createdAt: string | null | undefined,
  now = Date.now()
): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now - created <= COUNTRY_GEO_SIGNUP_WINDOW_MS;
}
