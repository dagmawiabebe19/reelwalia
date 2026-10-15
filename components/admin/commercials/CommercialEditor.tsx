"use client";

import { useRef, useState, type ReactNode } from "react";
import { discardCommercialUpload, saveCommercial } from "@/app/admin/commercials/actions";
import {
  COMMERCIAL_ASPECT_RATIOS,
  COMMERCIAL_CATEGORY_SUGGESTIONS,
  type Commercial,
  type CommercialAspectRatio,
} from "@/lib/commercials/constants";
import { readVideoDuration, uploadCommercialFile } from "@/lib/commercials/upload";

function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="rw-form-label">
      {children}
    </label>
  );
}

function detectAspect(file: File): Promise<CommercialAspectRatio | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const r = v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 0;
      if (!r) return resolve(null);
      resolve(r < 0.8 ? "9:16" : r > 1.25 ? "16:9" : "1:1");
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    v.src = url;
  });
}

export function CommercialEditor({
  commercial,
  nextSortOrder,
  onDone,
  onCancel,
}: {
  commercial: Commercial | null;
  nextSortOrder: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(commercial?.title ?? "");
  const [clientName, setClientName] = useState(commercial?.client_name ?? "");
  const [description, setDescription] = useState(commercial?.description ?? "");
  const [videoUrl, setVideoUrl] = useState(commercial?.video_url ?? "");
  const [thumbUrl, setThumbUrl] = useState(commercial?.thumbnail_url ?? "");
  const [aspect, setAspect] = useState<CommercialAspectRatio>(commercial?.aspect_ratio ?? "9:16");
  const [duration, setDuration] = useState<number | null>(commercial?.duration_seconds ?? null);
  const [category, setCategory] = useState(commercial?.category ?? "");
  const [featured, setFeatured] = useState(commercial?.is_featured ?? false);
  const [published, setPublished] = useState(commercial?.is_published ?? true);
  const [sortOrder, setSortOrder] = useState(commercial?.sort_order ?? nextSortOrder);

  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [thumbProgress, setThumbProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Files uploaded in this editor session that are not yet saved to a row. */
  const unsaved = useRef<Set<string>>(new Set());

  const discard = (url: string) => {
    if (unsaved.current.delete(url)) void discardCommercialUpload(url).catch(() => {});
  };

  const onVideo = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setVideoProgress(0);
    try {
      const [detected, seconds] = await Promise.all([detectAspect(file), readVideoDuration(file)]);
      const url = await uploadCommercialFile(file, "video", setVideoProgress);
      if (videoUrl) discard(videoUrl);
      unsaved.current.add(url);
      setVideoUrl(url);
      if (detected) setAspect(detected);
      if (seconds != null) setDuration(seconds);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Video upload failed");
    } finally {
      setVideoProgress(null);
    }
  };

  const onThumb = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setThumbProgress(0);
    try {
      const url = await uploadCommercialFile(file, "thumb", setThumbProgress);
      if (thumbUrl) discard(thumbUrl);
      unsaved.current.add(url);
      setThumbUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thumbnail upload failed");
    } finally {
      setThumbProgress(null);
    }
  };

  const uploading = videoProgress !== null || thumbProgress !== null;

  const onSave = async () => {
    setError(null);
    if (!title.trim()) return setError("Title is required.");
    if (!videoUrl) return setError("Upload a video first.");
    setSaving(true);
    try {
      await saveCommercial({
        id: commercial?.id,
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
      });
      unsaved.current.clear();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  };

  const cancel = () => {
    Array.from(unsaved.current).forEach(discard);
    onCancel();
  };

  return (
    <div className="rw-admin-panel space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg uppercase tracking-wide text-white">
          {commercial ? "Edit commercial" : "New commercial"}
        </h2>
        <button type="button" className="text-sm text-zinc-400 hover:text-white" onClick={cancel} disabled={saving}>
          Cancel
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-4">
          <div>
            <Label htmlFor="commercial-title">Title</Label>
            <input id="commercial-title" className="rw-form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="commercial-client">Client (blank = ReelWalia Original)</Label>
              <input id="commercial-client" className="rw-form-input" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="commercial-category">Category</Label>
              <input
                id="commercial-category"
                className="rw-form-input"
                list="commercial-category-options"
                value={category}
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
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-zinc-300">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              Published
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
              Featured (plays in hero)
            </label>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <Label htmlFor="commercial-video">Video (MP4 / MOV / WebM)</Label>
            {videoUrl && (
              <video
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
                className="mb-2 max-h-72 w-full rounded-lg bg-black object-contain"
              />
            )}
            <input
              id="commercial-video"
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              disabled={uploading || saving}
              onChange={(e) => {
                void onVideo(e.target.files?.[0]);
                e.target.value = "";
              }}
              className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
            />
            {videoProgress !== null && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-obsidian-red transition-all" style={{ width: `${Math.round(videoProgress * 100)}%` }} />
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="commercial-thumb">Thumbnail (JPG / PNG / WebP)</Label>
            {thumbUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbUrl} alt="" className="mb-2 max-h-48 rounded-lg object-contain" />
            )}
            <input
              id="commercial-thumb"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading || saving}
              onChange={(e) => {
                void onThumb(e.target.files?.[0]);
                e.target.value = "";
              }}
              className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
            />
            {thumbProgress !== null && <p className="mt-1 text-xs text-zinc-500">Uploading…</p>}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-3">
        <button type="button" className="rw-btn-secondary min-h-10 px-4 text-sm" onClick={cancel} disabled={saving}>
          Cancel
        </button>
        <button
          type="button"
          className="rw-btn-primary min-h-10 px-5 text-sm"
          onClick={() => void onSave()}
          disabled={saving || uploading}
        >
          {saving ? "Saving…" : uploading ? "Uploading…" : "Save commercial"}
        </button>
      </div>
    </div>
  );
}
