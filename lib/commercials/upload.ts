"use client";

import type { CommercialUploadKind } from "@/lib/commercials/object-path";

export const SUPABASE_UPLOAD_LIMIT_HINT =
  "Raise the global upload limit in Supabase → Storage → Settings (\"Upload file size limit\"), then try again.";

export class CommercialAdminError extends Error {
  constructor(
    message: string,
    readonly code: string
  ) {
    super(message);
  }
}

const NETWORK_MESSAGE = "Network error — check your connection and try again. Your form and files are kept.";

function fromApi(status: number, body: { error?: string; code?: string } | null): CommercialAdminError {
  const code = body?.code ?? (status === 401 ? "not_signed_in" : status === 403 ? "not_admin" : "error");
  const message =
    code === "not_signed_in"
      ? "You're signed out. Sign in as the admin account (in another tab), then retry — nothing here is lost."
      : code === "not_admin"
        ? "This account isn't the ReelWalia admin. Sign in with the admin account, then retry."
        : code === "too_large"
          ? `${body?.error ?? "File too large."} ${SUPABASE_UPLOAD_LIMIT_HINT}`
          : (body?.error ?? `Request failed (${status}). Please try again.`);
  return new CommercialAdminError(message, code);
}

/** JSON call to an admin API route with readable errors. */
export async function adminFetch<T>(url: string, init: { method: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method,
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new CommercialAdminError(NETWORK_MESSAGE, "network");
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string; code?: string }) | null;
  if (!res.ok) throw fromApi(res.status, body);
  return body as T;
}

function storageError(status: number, responseText: string): CommercialAdminError {
  let message = "";
  try {
    const parsed = JSON.parse(responseText) as { message?: string; error?: string };
    message = parsed.message ?? parsed.error ?? "";
  } catch {
    message = responseText;
  }
  if (status === 413 || /maximum allowed size|payload too large|entity too large/i.test(message)) {
    return new CommercialAdminError(
      `This file is larger than your Supabase project's upload limit. ${SUPABASE_UPLOAD_LIMIT_HINT}`,
      "too_large"
    );
  }
  if (/mime type|invalid_mime/i.test(message)) {
    return new CommercialAdminError("Supabase rejected this file type. Use MP4/MOV/WebM video or JPG/PNG/WebP images.", "invalid_type");
  }
  if (/bucket not found/i.test(message)) {
    return new CommercialAdminError(
      "The advertisements storage bucket is missing. Apply migration 035_commercials.sql in the Supabase SQL editor.",
      "migration_missing"
    );
  }
  if (status === 400 || status === 401 || status === 403) {
    return new CommercialAdminError("The upload link expired or was rejected. Click Save again to retry.", "upload_rejected");
  }
  return new CommercialAdminError(
    `Upload failed (${status || "no response"})${message ? `: ${message}` : ""}. Click Save again to retry.`,
    "upload_failed"
  );
}

export interface UploadedFile {
  path: string;
  publicUrl: string;
}

/**
 * Admin upload: the server (UUID-gated) issues a signed upload URL with the
 * service role, then the browser PUTs the file straight to Supabase Storage via
 * XHR for real progress. No serverless body limits, no storage RLS involved.
 */
export async function uploadCommercialFile(
  file: File,
  kind: CommercialUploadKind,
  onProgress?: (fraction: number) => void
): Promise<UploadedFile> {
  const signed = await adminFetch<{ path: string; signedUrl: string; publicUrl: string; contentType: string }>(
    "/api/admin/commercials/upload-url",
    { method: "POST", body: { kind, fileName: file.name, contentType: file.type, size: file.size } }
  );

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signed.signedUrl);
    xhr.setRequestHeader("content-type", signed.contentType);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anon) xhr.setRequestHeader("apikey", anon);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
      } else {
        reject(storageError(xhr.status, xhr.responseText));
      }
    };
    xhr.onerror = () => reject(new CommercialAdminError(NETWORK_MESSAGE, "network"));
    xhr.onabort = () => reject(new CommercialAdminError("Upload cancelled.", "aborted"));
    xhr.send(file);
  });

  return { path: signed.path, publicUrl: signed.publicUrl };
}

export function discardCommercialUpload(path: string): void {
  void adminFetch("/api/admin/commercials/discard-upload", { method: "POST", body: { path } }).catch(() => {});
}

/** Duration (whole seconds) and orientation read locally from the file's metadata. */
export function readVideoInfo(
  file: File
): Promise<{ duration: number | null; aspect: "9:16" | "16:9" | "1:1" | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const d = video.duration;
      const r = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 0;
      resolve({
        duration: Number.isFinite(d) ? Math.round(d) : null,
        aspect: !r ? null : r < 0.8 ? "9:16" : r > 1.25 ? "16:9" : "1:1",
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ duration: null, aspect: null });
    };
    video.src = url;
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
