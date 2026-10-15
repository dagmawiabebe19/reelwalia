"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CommercialDropzone } from "@/components/admin/commercials/CommercialDropzone";
import {
  COMMERCIAL_ASPECT_RATIOS,
  COMMERCIAL_CATEGORY_SUGGESTIONS,
  type Commercial,
  type CommercialAspectRatio,
} from "@/lib/commercials/constants";
import {
  UPLOAD_ACCEPT,
  UPLOAD_KIND_LABEL,
  resolveUploadType,
  type CommercialUploadKind,
} from "@/lib/commercials/object-path";
import {
  CommercialAdminError,
  adminFetch,
  discardCommercialUpload,
  readVideoInfo,
  uploadCommercialFile,
  type UploadedFile,
} from "@/lib/commercials/upload";

function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="rw-form-label">
      {children}
    </label>
  );
}

function fileNameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return decodeURIComponent(url.split("?")[0]!.split("/").pop() ?? "") || null;
}

function useObjectUrl(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return url;
}

export function CommercialEditor({
  commercial,
  nextSortOrder,
  onSaved,
  onCancel,
}: {
  commercial: Commercial | null;
  nextSortOrder: number;
  onSaved: (message: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(commercial?.title ?? "");
  const [clientName, setClientName] = useState(commercial?.client_name ?? "");
  const [description, setDescription] = useState(commercial?.description ?? "");
  const [aspect, setAspect] = useState<CommercialAspectRatio>(commercial?.aspect_ratio ?? "9:16");
  const [duration, setDuration] = useState<number | null>(commercial?.duration_seconds ?? null);
  const [category, setCategory] = useState(commercial?.category ?? "");
  const [featured, setFeatured] = useState(commercial?.is_featured ?? false);
  const [published, setPublished] = useState(commercial?.is_published ?? true);
  const [sortOrder, setSortOrder] = useState(commercial?.sort_order ?? nextSortOrder);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<{ video: number | null; thumbnail: number | null }>({
    video: null,
    thumbnail: null,
  });
  const [phase, setPhase] = useState<"idle" | "uploading" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  /** Files already uploaded this session (so a retry never re-uploads them). */
  const uploads = useRef(new Map<File, UploadedFile>());
  const videoPreview = useObjectUrl(videoFile);
  const thumbPreview = useObjectUrl(thumbFile);
  const busy = phase !== "idle";

  const pick = (kind: CommercialUploadKind, file: File) => {
    if (!resolveUploadType(kind, file.name, file.type)) {
      setError(UPLOAD_KIND_LABEL[kind]);
      return;
    }
    setError(null);
    const previous = kind === "video" ? videoFile : thumbFile;
    const prevUpload = previous ? uploads.current.get(previous) : undefined;
    if (previous && prevUpload) {
      uploads.current.delete(previous);
      discardCommercialUpload(prevUpload.path);
    }
    if (kind === "video") {
      setVideoFile(file);
      void readVideoInfo(file).then(({ duration: d, aspect: a }) => {
        if (d != null) setDuration(d);
        if (a) setAspect(a);
      });
    } else {
      setThumbFile(file);
    }
  };

  const ensureUploaded = async (kind: CommercialUploadKind, file: File | null): Promise<string | null> => {
    if (!file) return null;
    const cached = uploads.current.get(file);
    if (cached) return cached.publicUrl;
    setProgress((p) => ({ ...p, [kind]: 0 }));
    try {
      const result = await uploadCommercialFile(file, kind, (f) => setProgress((p) => ({ ...p, [kind]: f })));
      uploads.current.set(file, result);
      return result.publicUrl;
    } finally {
      setProgress((p) => ({ ...p, [kind]: null }));
    }
  };

  const onSave = async () => {
    setError(null);
    if (!title.trim()) return setError("Title is required.");
    if (!videoFile && !commercial?.video_url) return setError("Choose a video file.");

    try {
      setPhase("uploading");
      const videoUrl = (await ensureUploaded("video", videoFile)) ?? commercial!.video_url;
      const thumbUrl = (await ensureUploaded("thumbnail", thumbFile)) ?? commercial?.thumbnail_url ?? null;

      setPhase("saving");
      const payload = {
        title,
        client_name: clientName,
        description,
        video_url: videoUrl,
        thumbnail_url: thumbUrl,
        aspect_ratio: aspect,
        duration_seconds: duration,
        category,
        is_featured: featured,
        is_published: published,
        sort_order: sortOrder,
      };
      if (commercial) {
        await adminFetch(`/api/admin/commercials/${commercial.id}`, { method: "PATCH", body: payload });
      } else {
        await adminFetch("/api/admin/commercials", { method: "POST", body: payload });
      }
      uploads.current.clear();
      onSaved(commercial ? `Saved “${title.trim()}”. /ads is updated.` : `Uploaded “${title.trim()}”. It's live on /ads${published ? "" : " once published"}.`);
    } catch (e) {
      setError(
        e instanceof CommercialAdminError
          ? e.message
          : "Something went wrong. Your form and files are kept. Click Save to retry."
      );
      setPhase("idle");
    }
  };

  const cancel = () => {
    uploads.current.forEach((u) => discardCommercialUpload(u.path));
    uploads.current.clear();
    onCancel();
  };

  const actionLabel =
    phase === "uploading"
      ? progress.video !== null
        ? `Uploading video… ${Math.round(progress.video * 100)}%`
        : "Uploading thumbnail…"
      : phase === "saving"
        ? "Saving…"
        : commercial
          ? "Save changes"
          : "Upload & save";

  return (
    <div className="rw-admin-panel space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg uppercase tracking-wide text-white">
          {commercial ? "Edit commercial" : "Upload commercial"}
        </h2>
        <button type="button" className="text-sm text-zinc-400 hover:text-white" onClick={cancel} disabled={busy}>
          Cancel
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <div>
            <Label htmlFor="commercial-title">Title</Label>
            <input id="commercial-title" className="rw-form-input" value={title} disabled={busy} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="commercial-client">Client (blank = ReelWalia Original)</Label>
              <input id="commercial-client" className="rw-form-input" value={clientName} disabled={busy} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="commercial-category">Category</Label>
              <input
                id="commercial-category"
                className="rw-form-input"
                list="commercial-category-options"
                value={category}
                disabled={busy}
                onChange={(e) => setCategory(e.target.value)}
              />
              <datalist id="commercial-category-options">
                {COMMERCIAL_CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>
          <div>
            <Label htmlFor="commercial-description">Description</Label>
            <textarea
              id="commercial-description"
              className="rw-form-textarea"
              rows={4}
              value={description}
              disabled={busy}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="commercial-aspect">Aspect ratio</Label>
              <select
                id="commercial-aspect"
                className="rw-form-select"
                value={aspect}
                disabled={busy}
                onChange={(e) => setAspect(e.target.value as CommercialAspectRatio)}
              >
                {COMMERCIAL_ASPECT_RATIOS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="commercial-duration">Duration (sec)</Label>
              <input
                id="commercial-duration"
                type="number"
                min={0}
                className="rw-form-input"
                value={duration ?? ""}
                disabled={busy}
                onChange={(e) => setDuration(e.target.value === "" ? null : Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="commercial-sort">Sort order</Label>
              <input
                id="commercial-sort"
                type="number"
                className="rw-form-input"
                value={sortOrder}
                disabled={busy}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-zinc-300">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={published} disabled={busy} onChange={(e) => setPublished(e.target.checked)} />
              Published
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={featured} disabled={busy} onChange={(e) => setFeatured(e.target.checked)} />
              Featured (plays in hero)
            </label>
          </div>
        </div>

        <div className="space-y-5">
          <CommercialDropzone
            id="commercial-video"
            label="Video"
            hint="MP4, MOV, or WebM"
            accept={UPLOAD_ACCEPT.video}
            file={videoFile}
            currentName={fileNameFromUrl(commercial?.video_url)}
            previewUrl={videoPreview ?? commercial?.video_url ?? null}
            previewKind="video"
            progress={progress.video}
            uploaded={Boolean(videoFile && uploads.current.has(videoFile))}
            disabled={busy}
            onFile={(f) => pick("video", f)}
          />
          <CommercialDropzone
            id="commercial-thumb"
            label="Thumbnail"
            hint="JPG, PNG, or WebP"
            accept={UPLOAD_ACCEPT.thumbnail}
            file={thumbFile}
            currentName={fileNameFromUrl(commercial?.thumbnail_url)}
            previewUrl={thumbPreview ?? commercial?.thumbnail_url ?? null}
            previewKind="image"
            progress={progress.thumbnail}
            uploaded={Boolean(thumbFile && uploads.current.has(thumbFile))}
            disabled={busy}
            onFile={(f) => pick("thumbnail", f)}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" className="rw-btn-secondary min-h-10 px-4 text-sm" onClick={cancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="rw-btn-primary min-h-10 px-5 text-sm" onClick={() => void onSave()} disabled={busy}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
