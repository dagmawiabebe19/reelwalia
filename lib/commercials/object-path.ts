export type CommercialUploadKind = "video" | "thumbnail";

// No "a" or "d": object paths must never contain "ad" (ad-blocker URL filters).
// Random UUIDs are hex and can contain "ad", so they are not used here.
const NAME_ALPHABET = "bcefghjkmnpqrstuvwxyz23456789";

const TYPES: Record<CommercialUploadKind, Record<string, string[]>> = {
  video: {
    "video/mp4": ["mp4", "m4v"],
    "video/quicktime": ["mov"],
    "video/webm": ["webm"],
  },
  thumbnail: {
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/webp": ["webp"],
  },
};

export const UPLOAD_KIND_LABEL: Record<CommercialUploadKind, string> = {
  video: "Video must be an MP4, MOV, or WebM file.",
  thumbnail: "Thumbnail must be a JPG, PNG, or WebP image.",
};

export const UPLOAD_ACCEPT: Record<CommercialUploadKind, string> = {
  video: "video/mp4,video/quicktime,video/webm,.mp4,.m4v,.mov,.webm",
  thumbnail: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
};

export function commercialObjectName(length = 20): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => NAME_ALPHABET[b % NAME_ALPHABET.length]).join("");
}

function extensionOf(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i === -1 ? "" : fileName.slice(i + 1).toLowerCase();
}

/**
 * Resolve the stored content type for an upload, or null when the file is not an
 * allowed type. Browsers sometimes send an empty type (notably for .mov), so the
 * extension is used as a fallback; a declared type must agree with the extension.
 */
export function resolveUploadType(
  kind: CommercialUploadKind,
  fileName: string,
  contentType: string | null | undefined
): { contentType: string; ext: string } | null {
  const types = TYPES[kind];
  const ext = extensionOf(fileName);
  const declared = (contentType ?? "").trim().toLowerCase();

  if (declared) {
    const exts = types[declared];
    if (!exts) return null;
    return { contentType: declared, ext: exts.includes(ext) ? ext : exts[0]! };
  }
  for (const [mime, exts] of Object.entries(types)) {
    if (exts.includes(ext)) return { contentType: mime, ext };
  }
  return null;
}

export function commercialObjectPath(kind: CommercialUploadKind, ext: string): string {
  const safeExt = ext === "jpeg" ? "jpg" : ext === "m4v" ? "mp4" : ext;
  return `${kind === "video" ? "videos" : "thumbs"}/${commercialObjectName()}.${safeExt}`;
}

/** Only paths this app generates are accepted back from the client (discard, delete). */
export function isCommercialObjectPath(path: string): boolean {
  return /^(videos|thumbs)\/[bcefghjkmnpqrstuvwxyz2-9]{8,64}\.(mp4|mov|webm|jpg|png|webp)$/.test(path);
}
