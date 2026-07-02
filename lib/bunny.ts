const BUNNY_API_BASE = "https://video.bunnycdn.com";

function getConfig() {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  const cdnHostname = process.env.BUNNY_CDN_HOSTNAME;

  if (!libraryId || !apiKey || !cdnHostname) {
    throw new Error("Missing Bunny Stream environment variables");
  }

  return { libraryId, apiKey, cdnHostname };
}

function bunnyHeaders(apiKey: string) {
  return {
    AccessKey: apiKey,
    "Content-Type": "application/json",
  };
}

export interface BunnyCreateVideoResult {
  videoId: string;
  uploadUrl: string;
}

export interface BunnyVideoStatus {
  videoId: string;
  status: number;
  encodeProgress: number;
  length: number;
  storageSize: number;
  title: string;
}

/** Bunny status codes: 0=created, 1=uploaded, 2=processing, 3=transcoding, 4=finished, 5=error */
export function isVideoReady(status: number): boolean {
  return status === 4;
}

/** True when Bunny has received source bytes (upload succeeded). */
export function bunnyVideoHasSource(status: BunnyVideoStatus): boolean {
  return status.storageSize > 0;
}

export function bunnyVideoPlaybackIssue(status: BunnyVideoStatus): string | null {
  if (status.status === 5) {
    return "Bunny reported an encoding error — re-upload this episode.";
  }
  if (!bunnyVideoHasSource(status)) {
    return "No video file on Bunny for this GUID — use Replace Video to re-upload.";
  }
  if (!isVideoReady(status.status)) {
    return "Video is still transcoding on Bunny — playback works when encoding finishes.";
  }
  return null;
}

export async function createVideo(title: string): Promise<BunnyCreateVideoResult> {
  const { libraryId, apiKey } = getConfig();

  const res = await fetch(`${BUNNY_API_BASE}/library/${libraryId}/videos`, {
    method: "POST",
    headers: bunnyHeaders(apiKey),
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny createVideo failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { guid: string };
  const videoId = data.guid;
  const uploadUrl = `${BUNNY_API_BASE}/library/${libraryId}/videos/${videoId}`;

  return { videoId, uploadUrl };
}

export async function getVideoStatus(videoId: string): Promise<BunnyVideoStatus> {
  const { libraryId, apiKey } = getConfig();

  const res = await fetch(
    `${BUNNY_API_BASE}/library/${libraryId}/videos/${videoId}`,
    { headers: { AccessKey: apiKey }, cache: "no-store" }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny getVideoStatus failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    guid: string;
    status: number;
    encodeProgress: number;
    length: number;
    storageSize: number;
    title: string;
  };

  return {
    videoId: data.guid,
    status: data.status,
    encodeProgress: data.encodeProgress,
    length: data.length,
    storageSize: data.storageSize ?? 0,
    title: data.title,
  };
}

export function getPlaybackUrl(videoId: string): string {
  const { cdnHostname } = getConfig();
  return `https://${cdnHostname}/${videoId}/playlist.m3u8`;
}

export function getThumbnailUrl(videoId: string): string {
  const { cdnHostname } = getConfig();
  return `https://${cdnHostname}/${videoId}/thumbnail.jpg`;
}

export async function deleteVideo(videoId: string): Promise<void> {
  const { libraryId, apiKey } = getConfig();

  const res = await fetch(
    `${BUNNY_API_BASE}/library/${libraryId}/videos/${videoId}`,
    { method: "DELETE", headers: { AccessKey: apiKey } }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny deleteVideo failed: ${res.status} ${text}`);
  }
}
