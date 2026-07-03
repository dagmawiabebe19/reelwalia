/** Client-side Bunny video upload helpers for admin episode management. */

import * as tus from "tus-js-client";

export interface BunnyPresignedUploadCredentials {
  videoId: string;
  libraryId: string;
  expirationTime: number;
  signature: string;
}

const BUNNY_TUS_ENDPOINT = "https://video.bunnycdn.com/tusupload";

function assertUploadFile(file: File): void {
  if (!file.size) {
    throw new Error(
      "Selected file is empty (0 bytes). If the file is in iCloud/Drive, download it locally first."
    );
  }
}

export async function initBunnyUpload(title: string): Promise<BunnyPresignedUploadCredentials> {
  const res = await fetch("/api/admin/episodes/create-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  const data = (await res.json()) as BunnyPresignedUploadCredentials & { error?: string };

  if (
    !res.ok ||
    !data.videoId ||
    !data.libraryId ||
    !data.signature ||
    !data.expirationTime
  ) {
    throw new Error(data.error ?? "Failed to init upload");
  }

  return {
    videoId: data.videoId,
    libraryId: data.libraryId,
    expirationTime: data.expirationTime,
    signature: data.signature,
  };
}

/**
 * Direct browser → Bunny upload via presigned TUS (bytes never pass through Vercel).
 * Bunny's HTTP PUT endpoint only accepts AccessKey; presigned auth is supported on TUS.
 */
export function uploadVideoToBunny(
  file: File,
  credentials: BunnyPresignedUploadCredentials,
  onProgress?: (percent: number) => void
): Promise<void> {
  assertUploadFile(file);

  return new Promise((resolve, reject) => {
    let bytesUploaded = 0;
    let bytesTotal = file.size;

    const upload = new tus.Upload(file, {
      endpoint: BUNNY_TUS_ENDPOINT,
      retryDelays: [0, 3000, 5000, 10_000, 20_000, 60_000],
      headers: {
        AuthorizationSignature: credentials.signature,
        AuthorizationExpire: String(credentials.expirationTime),
        VideoId: credentials.videoId,
        LibraryId: credentials.libraryId,
      },
      metadata: {
        filetype: file.type || "video/mp4",
        title: file.name,
      },
      onError(error) {
        reject(error instanceof Error ? error : new Error("Bunny upload failed"));
      },
      onProgress(uploaded, total) {
        bytesUploaded = uploaded;
        bytesTotal = total;
        if (onProgress && total > 0) {
          onProgress(Math.round((uploaded / total) * 100));
        }
      },
      onSuccess() {
        if (bytesUploaded <= 0 || bytesUploaded < bytesTotal) {
          reject(
            new Error(
              `Upload finished but only ${bytesUploaded.toLocaleString()} of ${bytesTotal.toLocaleString()} bytes were sent.`
            )
          );
          return;
        }
        resolve();
      },
    });

    void upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  });
}

export async function finalizeNewEpisode(params: {
  seriesId: string;
  videoId: string;
  title: string;
  episodeNumber: number;
}) {
  const res = await fetch("/api/admin/episodes/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Finalize failed");
}

export async function replaceEpisodeVideo(params: {
  episodeId: string;
  videoId: string;
}) {
  const res = await fetch("/api/admin/episodes/replace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Replace failed");
}

export async function uploadAndReplaceEpisode(params: {
  file: File;
  seriesTitle: string;
  episodeTitle: string;
  episodeId: string;
  onProgress?: (percent: number, status: string) => void;
}) {
  const { file, seriesTitle, episodeTitle, episodeId, onProgress } = params;

  onProgress?.(0, "Creating upload…");
  const credentials = await initBunnyUpload(`${seriesTitle} — ${episodeTitle}`);

  onProgress?.(10, "Uploading to Bunny…");
  await uploadVideoToBunny(file, credentials, (pct) => {
    onProgress?.(10 + Math.round(pct * 0.7), "Uploading to Bunny…");
  });

  onProgress?.(85, "Verifying upload…");
  await replaceEpisodeVideo({ episodeId, videoId: credentials.videoId });
  onProgress?.(100, "Done");
}
