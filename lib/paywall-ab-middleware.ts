import { NextResponse, type NextRequest } from "next/server";
import {
  PAYWALL_AB_COOKIE,
  PAYWALL_AB_CONFIG,
  parsePaywallAbCookie,
  paywallAbCookieOptions,
  pickPaywallVariant,
  serializePaywallAbCookie,
} from "@/lib/paywall-ab";

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
 * Sticky first-visit assignment via httpOnly cookie.
 * Sets the cookie on both the forwarded request (so RSC can read it on this hit)
 * and the response (so it persists). Existing signed-in users are not randomized here.
 */
export function applyPaywallAbCookie(
  request: NextRequest,
  response: NextResponse,
  userId: string | null
): NextResponse {
  if (!shouldAssignOnPath(request.nextUrl.pathname)) {
    return response;
  }

  const existing = parsePaywallAbCookie(request.cookies.get(PAYWALL_AB_COOKIE)?.value);
  const options = paywallAbCookieOptions();

  let serialized: string | null = null;

  if (userId) {
    if (existing) {
      serialized = serializePaywallAbCookie(existing);
    }
  } else if (existing) {
    serialized = serializePaywallAbCookie(existing);
  } else if (PAYWALL_AB_CONFIG.enabled) {
    serialized = serializePaywallAbCookie({
      visitorId: crypto.randomUUID(),
      variant: pickPaywallVariant(),
    });
  }

  if (!serialized) return response;

  request.cookies.set(PAYWALL_AB_COOKIE, serialized);

  const location = response.headers.get("location");
  if (location) {
    response.cookies.set(PAYWALL_AB_COOKIE, serialized, options);
    return response;
  }

  const next = NextResponse.next({ request });
  copyCookies(response, next);
  next.cookies.set(PAYWALL_AB_COOKIE, serialized, options);
  return next;
}
