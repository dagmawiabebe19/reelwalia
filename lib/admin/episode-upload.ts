/** Client-side Bunny video upload helpers for admin episode management. */

export interface BunnyUploadInit {
  videoId: string;
  uploadUrl: string;
  apiKey: string;
}

export async function initBunnyUpload(title: string): Promise<BunnyUploadInit> {
  const res = await fetch("/api/admin/episodes/create-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  const data = (await res.json()) as BunnyUploadInit & { error?: string };

  if (!res.ok || !data.videoId || !data.uploadUrl) {
    throw new Error(data.error ?? "Failed to init upload");
  }

  return {
    videoId: data.videoId,
    uploadUrl: data.uploadUrl,
    apiKey: data.apiKey ?? "",
  };
}

export function putVideoToBunny(
  file: File,
  uploadUrl: string,
  apiKey: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("AccessKey", apiKey);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(file);
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
  const { videoId, uploadUrl, apiKey } = await initBunnyUpload(
    `${seriesTitle} — ${episodeTitle}`
  );

  onProgress?.(10, "Uploading to Bunny…");
  await putVideoToBunny(file, uploadUrl, apiKey, (pct) => {
    onProgress?.(10 + Math.round(pct * 0.7), "Uploading to Bunny…");
  });

  onProgress?.(85, "Saving…");
  await replaceEpisodeVideo({ episodeId, videoId });
  onProgress?.(100, "Done");
}
