import { createHash } from "node:crypto";

const TUS_UPLOAD_TTL_SECONDS = 86_400;

export interface BunnyTusUploadCredentials {
  videoId: string;
  libraryId: string;
  expirationTime: number;
  signature: string;
}

export function createBunnyTusUploadCredentials(videoId: string): BunnyTusUploadCredentials {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;

  if (!libraryId || !apiKey) {
    throw new Error("Missing Bunny Stream environment variables");
  }

  const expirationTime = Math.floor(Date.now() / 1000) + TUS_UPLOAD_TTL_SECONDS;
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
