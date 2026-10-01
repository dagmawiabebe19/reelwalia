import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  signBunnyUrl,
  signBunnyVideoUrl,
  type BunnyTokenAlgorithm,
} from "@/lib/video/bunnySign";

const DEFAULT_STREAM_TTL_SECONDS = 300;
const MAX_STREAM_TTL_SECONDS = 900;
const THUMBNAIL_TTL_SECONDS = 6 * 60 * 60;
const THUMBNAIL_BUCKET_SECONDS = 60 * 60;

interface SigningConfig {
  key: string;
  host: string | null;
  algorithm: BunnyTokenAlgorithm;
  baseTtl: number;
}

function getSigningConfig(): SigningConfig | null {
  const key = process.env.BUNNY_TOKEN_AUTH_KEY?.trim();
  if (!key) return null;
  const host = process.env.BUNNY_CDN_HOSTNAME?.trim().toLowerCase() || null;
  const algorithm: BunnyTokenAlgorithm =
    process.env.BUNNY_TOKEN_AUTH_ALGORITHM?.trim().toLowerCase() === "sha256" ? "sha256" : "hmac";
  const ttl = Number(process.env.BUNNY_STREAM_TOKEN_TTL_SECONDS);
  const baseTtl =
    Number.isFinite(ttl) && ttl >= 60 ? Math.min(ttl, MAX_STREAM_TTL_SECONDS) : DEFAULT_STREAM_TTL_SECONDS;
  return { key, host, algorithm, baseTtl };
}

export function isBunnySigningEnabled(): boolean {
  return getSigningConfig() !== null;
}

function isBunnyHost(url: URL, cfg: SigningConfig): boolean {
  return cfg.host ? url.host.toLowerCase() === cfg.host : url.host.toLowerCase().endsWith(".b-cdn.net");
}

/**
 * Token lifetime: the base TTL, stretched to cover one uninterrupted watch of the
 * episode (duration + 60s), capped at 15 minutes. Players re-fetch on expiry.
 */
export function streamTtlSeconds(durationSeconds: number | null | undefined, baseTtl = DEFAULT_STREAM_TTL_SECONDS): number {
  const watch = durationSeconds && durationSeconds > 0 ? Math.ceil(durationSeconds) + 60 : 0;
  return Math.min(Math.max(baseTtl, watch), MAX_STREAM_TTL_SECONDS);
}

/**
 * Short-lived signed playback URL. Before BUNNY_TOKEN_AUTH_KEY is configured the
 * raw URL is returned (token auth not yet enforced on the pull zone).
 */
export function signStreamUrl(
  rawUrl: string,
  opts?: { durationSeconds?: number | null; nowMs?: number }
): { url: string; expiresAt: number | null } {
  const cfg = getSigningConfig();
  if (!cfg) return { url: rawUrl, expiresAt: null };
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { url: rawUrl, expiresAt: null };
  }
  if (!isBunnyHost(parsed, cfg)) return { url: rawUrl, expiresAt: null };

  const now = Math.floor((opts?.nowMs ?? Date.now()) / 1000);
  const expires = now + streamTtlSeconds(opts?.durationSeconds, cfg.baseTtl);
  return {
    url: signBunnyVideoUrl({ url: rawUrl, securityKey: cfg.key, expires, algorithm: cfg.algorithm }),
    expiresAt: expires,
  };
}

/**
 * Per-file token for a Bunny thumbnail (never a directory token — it must not
 * unlock the playlist). Expiry is bucketed to the hour so the URL stays cacheable.
 */
export function signThumbnailUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return rawUrl ?? null;
  const cfg = getSigningConfig();
  if (!cfg) return rawUrl;
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return rawUrl;
  }
  if (!isBunnyHost(parsed, cfg)) return rawUrl;
  const now = Math.floor(Date.now() / 1000);
  const expires =
    Math.ceil((now + THUMBNAIL_TTL_SECONDS) / THUMBNAIL_BUCKET_SECONDS) * THUMBNAIL_BUCKET_SECONDS;
  return signBunnyUrl({ url: rawUrl, securityKey: cfg.key, expires, algorithm: cfg.algorithm });
}

/**
 * Raw video URLs are not readable with the anon/user key (migration 034), so
 * playable URLs are read with the service-role client — only call this for
 * episode IDs the caller has already authorised.
 */
export async function loadSignedStreamUrls(
  episodeIds: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (episodeIds.length === 0) return result;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("episodes")
    .select("id, video_url, duration_seconds")
    .in("id", episodeIds);
  if (error) {
    console.error("[stream] video url lookup failed:", error.message);
    return result;
  }
  for (const row of data ?? []) {
    if (!row.video_url) continue;
    result.set(row.id, signStreamUrl(row.video_url, { durationSeconds: row.duration_seconds }).url);
  }
  return result;
}
