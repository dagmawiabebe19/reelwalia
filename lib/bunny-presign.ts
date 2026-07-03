import "server-only";

import { createHash } from "node:crypto";

/** Presigned upload TTL — Bunny recommends ≥1 hour for large files. */
const UPLOAD_TTL_SECONDS = 86_400;

export interface BunnyPresignedUploadCredentials {
  videoId: string;
  libraryId: string;
  expirationTime: number;
  signature: string;
}

/**
 * Server-side presigned upload auth for Bunny Stream TUS uploads.
 * SHA256(libraryId + apiKey + expirationTime + videoId) — API key never leaves the server.
 */
export function createBunnyPresignedUploadCredentials(
  videoId: string
): BunnyPresignedUploadCredentials {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;

  if (!libraryId || !apiKey) {
    throw new Error("Missing Bunny Stream environment variables");
  }

  const expirationTime = Math.floor(Date.now() / 1000) + UPLOAD_TTL_SECONDS;
  const signature = createHash("sha256")
    .update(`${libraryId}${apiKey}${expirationTime}${videoId}`)
    .digest("hex");

  return {
    videoId,
    libraryId,
    expirationTime,
    signature,
  };
}
