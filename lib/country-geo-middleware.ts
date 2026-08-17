import { NextResponse, type NextRequest } from "next/server";
import {
  COUNTRY_GEO_COOKIE,
  countryFromRequestHeaders,
  countryGeoCookieOptions,
  parseCountryGeoCookie,
  serializeCountryGeoCookie,
} from "@/lib/country-geo";

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

/**
 * Sticky first-touch country from Vercel geo header (no IP stored).
 * Only sets cookie when a valid ISO country is present on the request.
 */
export function applyCountryGeoCookie(
  request: NextRequest,
  response: NextResponse,
  userId: string | null
): NextResponse {
  if (!shouldAssignOnPath(request.nextUrl.pathname)) {
    return response;
  }

  const existing = parseCountryGeoCookie(request.cookies.get(COUNTRY_GEO_COOKIE)?.value);
  const options = countryGeoCookieOptions();

  let serialized: string | null = null;

  if (userId) {
    if (existing) {
      serialized = serializeCountryGeoCookie(existing);
    }
  } else if (existing) {
    serialized = serializeCountryGeoCookie(existing);
  } else {
    const country = countryFromRequestHeaders(request.headers);
    if (country) {
      serialized = serializeCountryGeoCookie({
        visitorId: crypto.randomUUID(),
        country,
      });
    }
  }

  if (!serialized) return response;

  request.cookies.set(COUNTRY_GEO_COOKIE, serialized);

  const location = response.headers.get("location");
  if (location) {
    response.cookies.set(COUNTRY_GEO_COOKIE, serialized, options);
    return response;
  }

  const next = NextResponse.next({ request });
  copyCookies(response, next);
  next.cookies.set(COUNTRY_GEO_COOKIE, serialized, options);
  return next;
}
