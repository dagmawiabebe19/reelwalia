import { NextResponse, type NextRequest } from "next/server";
import {
  TRAFFIC_SOURCE_COOKIE,
  classifyTrafficFromLanding,
  parseTrafficSourceCookie,
  serializeTrafficSourceCookie,
  trafficSourceCookieOptions,
} from "@/lib/traffic-source";

function shouldAssignOnPath(pathname: string): boolean {
  if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return false;
  if (pathname.startsWith("/auth")) return false;
  return true;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
}

function landingSignals(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return {
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    referrer: request.headers.get("referer") ?? request.headers.get("referrer"),
    fbclid: params.get("fbclid"),
    gclid: params.get("gclid"),
    ttclid: params.get("ttclid"),
    msclkid: params.get("msclkid"),
  };
}

/**
 * Sticky first-touch traffic source via httpOnly cookie.
 * Reads UTM params and referrer on the first visit only — never overwritten.
 */
export function applyTrafficSourceCookie(
  request: NextRequest,
  response: NextResponse,
  userId: string | null
): NextResponse {
  if (!shouldAssignOnPath(request.nextUrl.pathname)) {
    return response;
  }

  const existing = parseTrafficSourceCookie(
    request.cookies.get(TRAFFIC_SOURCE_COOKIE)?.value
  );
  const options = trafficSourceCookieOptions();

  let serialized: string | null = null;

  if (userId) {
    if (existing) {
      serialized = serializeTrafficSourceCookie(existing);
    }
  } else if (existing) {
    serialized = serializeTrafficSourceCookie(existing);
  } else {
    const signals = landingSignals(request);
    const source = classifyTrafficFromLanding(signals);
    serialized = serializeTrafficSourceCookie({
      visitorId: crypto.randomUUID(),
      source,
      utmSource: signals.utmSource,
      utmMedium: signals.utmMedium,
      utmCampaign: signals.utmCampaign,
      referrer: signals.referrer,
    });
  }

  if (!serialized) return response;

  request.cookies.set(TRAFFIC_SOURCE_COOKIE, serialized);

  const location = response.headers.get("location");
  if (location) {
    response.cookies.set(TRAFFIC_SOURCE_COOKIE, serialized, options);
    return response;
  }

  const next = NextResponse.next({ request });
  copyCookies(response, next);
  next.cookies.set(TRAFFIC_SOURCE_COOKIE, serialized, options);
  return next;
}
