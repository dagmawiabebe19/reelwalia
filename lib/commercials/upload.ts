"use client";

import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import { COMMERCIALS_BUCKET } from "@/lib/commercials/constants";

// No "a" or "d": object names must never contain "ad" (ad-blocker URL filters).
const NAME_ALPHABET = "bcefghjkmnpqrstuvwxyz23456789";
const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};
const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
/** Supabase resumable uploads require exactly 6 MB chunks. */
const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

export function commercialObjectName(length = 20): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => NAME_ALPHABET[b % NAME_ALPHABET.length]).join("");
}

export function commercialObjectPath(kind: "video" | "thumb", mime: string): string {
  const ext = (kind === "video" ? VIDEO_EXT : IMAGE_EXT)[mime];
  if (!ext) {
    throw new Error(
      kind === "video" ? "Use an MP4, MOV, or WebM video." : "Use a JPG, PNG, or WebP image."
    );
  }
  return `${kind === "video" ? "videos" : "thumbs"}/${commercialObjectName()}.${ext}`;
}

/**
 * Browser → Supabase Storage directly (no serverless hop, so no body-size limit).
 * Videos use resumable TUS uploads; images use a single request. Returns the public URL.
 */
export async function uploadCommercialFile(
  file: File,
  kind: "video" | "thumb",
  onProgress?: (fraction: number) => void
): Promise<string> {
  const supabase = createClient();
  const path = commercialObjectPath(kind, file.type);

  if (kind === "thumb") {
    const { error } = await supabase.storage
      .from(COMMERCIALS_BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (error) throw new Error(error.message);
    onProgress?.(1);
  } else {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Your session expired. Sign in again to upload.");

    const projectUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    const endpoint = `${projectUrl.origin}/storage/v1/upload/resumable`;

    await new Promise<void>((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: { authorization: `Bearer ${session.access_token}`, "x-upsert": "false" },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        chunkSize: TUS_CHUNK_SIZE,
        metadata: {
          bucketName: COMMERCIALS_BUCKET,
          objectName: path,
          contentType: file.type,
          cacheControl: "31536000",
        },
        onError: (err) => reject(err),
        onProgress: (sent, total) => onProgress?.(total ? sent / total : 0),
        onSuccess: () => resolve(),
      });
      void upload.findPreviousUploads().then((previous) => {
        if (previous[0]) upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
      });
    });
  }

  return supabase.storage.from(COMMERCIALS_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Duration in whole seconds read from the file's metadata, or null. */
export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const d = video.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) ? Math.round(d) : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}
