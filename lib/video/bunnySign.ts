import { createHash, createHmac } from "node:crypto";

/**
 * Bunny CDN Advanced token authentication.
 *
 * "hmac"   — current reference signer (BunnyWay/BunnyCDN.TokenAuthentication):
 *            token = "HS256-" + b64url(HMAC-SHA256(key, signaturePath + expires + signingData))
 * "sha256" — legacy Advanced form, still accepted by Bunny:
 *            token = b64url(SHA256(key + signaturePath + expires + signingData))
 *
 * signaturePath is the token_path when set (directory token), else the URL path.
 * signingData is the sorted extra params as key=value joined by "&" (never token/expires).
 * No IP locking: mobile viewers change IPs mid-session.
 */
export type BunnyTokenAlgorithm = "hmac" | "sha256";

export interface BunnySignOptions {
  url: string;
  securityKey: string;
  /** Absolute UNIX seconds. */
  expires: number;
  /**
   * Directory scope, e.g. "/<videoId>/". When set, the token is embedded in the
   * URL path (/bcdn_token=…/) so relative HLS playlist/segment requests inherit it.
   */
  tokenPath?: string;
  /** Embed the token in the path (default: true whenever tokenPath is set). */
  embedInPath?: boolean;
  algorithm?: BunnyTokenAlgorithm;
}

function base64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function computeBunnyToken(params: {
  securityKey: string;
  signaturePath: string;
  expires: number;
  signingData: string;
  algorithm: BunnyTokenAlgorithm;
}): string {
  const expires = String(params.expires);
  if (params.algorithm === "sha256") {
    const digest = createHash("sha256")
      .update(params.securityKey + params.signaturePath + expires + params.signingData)
      .digest();
    return base64Url(digest);
  }
  const digest = createHmac("sha256", params.securityKey)
    .update(params.signaturePath)
    .update(expires)
    .update(params.signingData)
    .digest();
  return `HS256-${base64Url(digest)}`;
}

export function signBunnyUrl(opts: BunnySignOptions): string {
  if (!opts.securityKey) throw new Error("Bunny security key is required");
  if (!Number.isInteger(opts.expires) || opts.expires <= 0) {
    throw new Error("expires must be a positive UNIX timestamp in seconds");
  }

  const parsed = new URL(opts.url);
  const params: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    if (key === "token" || key === "expires") return;
    params[key] = value;
  });
  if (opts.tokenPath) params.token_path = opts.tokenPath;

  const sorted = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  const signingData = sorted.map(([k, v]) => `${k}=${v}`).join("&");
  const urlData = sorted.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

  const token = computeBunnyToken({
    securityKey: opts.securityKey,
    signaturePath: opts.tokenPath || parsed.pathname,
    expires: opts.expires,
    signingData,
    algorithm: opts.algorithm ?? "hmac",
  });

  const base = `${parsed.protocol}//${parsed.host}`;
  const tail = urlData ? `&${urlData}` : "";
  if (opts.embedInPath ?? Boolean(opts.tokenPath)) {
    return `${base}/bcdn_token=${token}${tail}&expires=${opts.expires}${parsed.pathname}`;
  }
  return `${base}${parsed.pathname}?token=${token}${tail}&expires=${opts.expires}`;
}

/** "/abc/def/playlist.m3u8" → "/abc/def/" */
export function directoryOf(pathname: string): string {
  const idx = pathname.lastIndexOf("/");
  return idx <= 0 ? "/" : pathname.slice(0, idx + 1);
}

/**
 * Sign a playable video URL. HLS (.m3u8) gets a directory token covering the
 * playlist, renditions and segments; anything else (MP4) a per-file token.
 */
export function signBunnyVideoUrl(
  opts: Omit<BunnySignOptions, "tokenPath" | "embedInPath">
): string {
  const { pathname } = new URL(opts.url);
  if (pathname.toLowerCase().endsWith(".m3u8")) {
    return signBunnyUrl({ ...opts, tokenPath: directoryOf(pathname) });
  }
  return signBunnyUrl(opts);
}