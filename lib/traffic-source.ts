/** First-touch traffic source — ad vs organic for analytics attribution. */

export const TRAFFIC_SOURCE_AD = "ad";
export const TRAFFIC_SOURCE_ORGANIC = "organic";
export const TRAFFIC_SOURCE_UNKNOWN = "unknown";

export type TrafficSource =
  | typeof TRAFFIC_SOURCE_AD
  | typeof TRAFFIC_SOURCE_ORGANIC
  | typeof TRAFFIC_SOURCE_UNKNOWN;

/** Events before this deploy date have no source — show as unknown, never guessed. */
export const TRAFFIC_SOURCE_ATTRIBUTION_START = "2026-08-17";

export const TRAFFIC_SOURCE_COOKIE = "rw_traffic";

export const TRAFFIC_SOURCE_LABELS: Record<TrafficSource, string> = {
  [TRAFFIC_SOURCE_AD]: "Ad",
  [TRAFFIC_SOURCE_ORGANIC]: "Organic",
  [TRAFFIC_SOURCE_UNKNOWN]: "Unknown",
};

const COOKIE_PREFIX = "v1";

/** Known paid ad platforms / campaign tags (utm_source, lowercase). */
const AD_UTM_SOURCES = new Set([
  "meta",
  "facebook",
  "fb",
  "instagram",
  "ig",
  "google",
  "googleads",
  "google_ads",
  "tiktok",
  "snap",
  "snapchat",
  "twitter",
  "x",
  "pinterest",
  "linkedin",
  "youtube",
  "bing",
  "microsoft",
]);

const AD_UTM_MEDIUMS = new Set([
  "cpc",
  "ppc",
  "paid",
  "paid_social",
  "paidsocial",
  "paid-social",
  "display",
  "retargeting",
  "cpm",
  "social_paid",
]);

export type TrafficSourceCookie = {
  visitorId: string;
  source: typeof TRAFFIC_SOURCE_AD | typeof TRAFFIC_SOURCE_ORGANIC;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
};

export type TrafficSourceFilter = "all" | "ad" | "organic";

export const TRAFFIC_SOURCE_FILTERS: { value: TrafficSourceFilter; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "ad", label: "Ad" },
  { value: "organic", label: "Organic" },
];

export function isTrafficSource(value: string | null | undefined): value is TrafficSource {
  return (
    value === TRAFFIC_SOURCE_AD ||
    value === TRAFFIC_SOURCE_ORGANIC ||
    value === TRAFFIC_SOURCE_UNKNOWN
  );
}

export function isAttributableTrafficSource(
  value: string | null | undefined
): value is typeof TRAFFIC_SOURCE_AD | typeof TRAFFIC_SOURCE_ORGANIC {
  return value === TRAFFIC_SOURCE_AD || value === TRAFFIC_SOURCE_ORGANIC;
}

export function parseTrafficSourceFilter(
  value: string | null | undefined
): TrafficSourceFilter {
  if (value === "ad" || value === "organic") return value;
  return "all";
}

function normalizeToken(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function looksLikeAdUtmSource(source: string): boolean {
  if (!source) return false;
  if (AD_UTM_SOURCES.has(source)) return true;
  if (source.includes("facebook") || source.includes("instagram")) return true;
  if (source.includes("meta")) return true;
  return false;
}

/**
 * Classify first-touch source from landing URL signals.
 * Direct visits with no UTM are organic. Unknown is only used when no cookie/profile exists at event time.
 */
export function classifyTrafficFromLanding(params: {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  ttclid?: string | null;
  msclkid?: string | null;
}): typeof TRAFFIC_SOURCE_AD | typeof TRAFFIC_SOURCE_ORGANIC {
  if (params.fbclid || params.gclid || params.ttclid || params.msclkid) {
    return TRAFFIC_SOURCE_AD;
  }

  const source = normalizeToken(params.utmSource);
  const medium = normalizeToken(params.utmMedium);
  const campaign = normalizeToken(params.utmCampaign);

  if (looksLikeAdUtmSource(source)) return TRAFFIC_SOURCE_AD;
  if (medium && AD_UTM_MEDIUMS.has(medium)) return TRAFFIC_SOURCE_AD;
  if (campaign && (campaign.includes("paid") || campaign.includes("_ad_"))) {
    return TRAFFIC_SOURCE_AD;
  }

  return TRAFFIC_SOURCE_ORGANIC;
}

type TrafficMeta = {
  s?: string;
  m?: string;
  c?: string;
  r?: string;
};

function encodeMeta(meta: TrafficMeta): string {
  const json = JSON.stringify(meta);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeMeta(raw: string | undefined): TrafficMeta {
  if (!raw) return {};
  try {
    const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as TrafficMeta;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function serializeTrafficSourceCookie(value: TrafficSourceCookie): string {
  const meta: TrafficMeta = {};
  if (value.utmSource) meta.s = value.utmSource;
  if (value.utmMedium) meta.m = value.utmMedium;
  if (value.utmCampaign) meta.c = value.utmCampaign;
  if (value.referrer) meta.r = value.referrer.slice(0, 512);
  const metaPart =
    meta.s || meta.m || meta.c || meta.r ? `.${encodeMeta(meta)}` : "";
  return `${COOKIE_PREFIX}.${value.visitorId}.${value.source}${metaPart}`;
}

export function parseTrafficSourceCookie(
  raw: string | undefined | null
): TrafficSourceCookie | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length < 3 || parts[0] !== COOKIE_PREFIX) return null;
  const visitorId = parts[1];
  const source = parts[2];
  if (!visitorId || visitorId.length < 8 || !isAttributableTrafficSource(source)) {
    return null;
  }
  const meta = decodeMeta(parts[3]);
  return {
    visitorId,
    source,
    utmSource: meta.s ?? null,
    utmMedium: meta.m ?? null,
    utmCampaign: meta.c ?? null,
    referrer: meta.r ?? null,
  };
}

export function trafficSourceCookieOptions(): {
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
export const TRAFFIC_SOURCE_SIGNUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function isNewAccountForTrafficSource(
  createdAt: string | null | undefined,
  now = Date.now()
): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now - created <= TRAFFIC_SOURCE_SIGNUP_WINDOW_MS;
}
