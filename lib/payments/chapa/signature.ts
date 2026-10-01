import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function hmacHex(key: string, payload: string): string {
  return createHmac("sha256", key).update(payload).digest("hex");
}

function safeEqualHex(expected: string, provided: string | null | undefined): boolean {
  if (!provided) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Chapa sends:
 *   x-chapa-signature = HMAC-SHA256(payload) — preferred.
 *   chapa-signature   = HMAC-SHA256(secret, keyed by secret) — fallback.
 * Docs are ambiguous on whether the key is the dashboard secret hash or the API
 * secret key, so both server-side secrets are accepted. Payload HMAC is checked
 * against the raw body first, then Chapa's JSON re-serialization.
 */
export function verifyChapaWebhookSignature(params: {
  rawBody: string;
  xChapaSignature: string | null;
  chapaSignature: string | null;
}): boolean {
  const keys = [process.env.CHAPA_WEBHOOK_SECRET, process.env.CHAPA_SECRET_KEY]
    .map((k) => k?.trim())
    .filter((k): k is string => Boolean(k));
  if (keys.length === 0) return false;

  let reserialized: string | null = null;
  try {
    reserialized = JSON.stringify(JSON.parse(params.rawBody));
  } catch {
    reserialized = null;
  }

  for (const key of keys) {
    if (safeEqualHex(hmacHex(key, params.rawBody), params.xChapaSignature)) return true;
    if (reserialized && safeEqualHex(hmacHex(key, reserialized), params.xChapaSignature)) {
      return true;
    }
  }
  for (const key of keys) {
    if (safeEqualHex(hmacHex(key, key), params.chapaSignature)) return true;
  }
  return false;
}
