const DEFAULT_SITE_URL = "http://localhost:3000";

/** Strip trailing slash from a base URL. */
export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/** Server-side site URL from env (fallback). */
export function getSiteUrlFromEnv(): string {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL
  );
}

/**
 * Resolve the public site origin for redirects and Stripe URLs.
 * Prefers the request Origin header, then forwarded host, then env.
 */
export function resolveBaseUrl(request: Request): string {
  const origin = request.headers.get("origin");
  if (origin) {
    return normalizeBaseUrl(origin);
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const proto = forwardedProto ?? "https";
    return normalizeBaseUrl(`${proto}://${forwardedHost}`);
  }

  const host = request.headers.get("host");
  if (host) {
    const proto = host.startsWith("localhost") ? "http" : "https";
    return normalizeBaseUrl(`${proto}://${host}`);
  }

  return getSiteUrlFromEnv();
}
