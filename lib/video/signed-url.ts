/** Reads `expires` (UNIX seconds) from a Bunny-signed URL, path or query form. Null when unsigned. */
export function signedUrlExpiresAt(url: string | null | undefined): number | null {
  if (!url) return null;
  const match = /[?&/]expires=(\d+)/.exec(url);
  return match ? Number(match[1]) : null;
}

/** True when the URL is signed and expires within `marginSeconds`. Unsigned URLs never "expire". */
export function signedUrlExpiresSoon(
  url: string | null | undefined,
  marginSeconds = 20,
  nowMs = Date.now()
): boolean {
  const expires = signedUrlExpiresAt(url);
  if (expires == null) return false;
  return expires * 1000 - nowMs <= marginSeconds * 1000;
}
