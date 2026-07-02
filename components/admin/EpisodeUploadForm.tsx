"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import {
  finalizeNewEpisode,
  initBunnyUpload,
  putVideoToBunny,
} from "@/lib/admin/episode-upload";

interface EpisodeUploadFormProps {
  seriesId: string;
  seriesTitle: string;
  nextEpisodeNumber: number;
}

export function EpisodeUploadForm({
  seriesId,
  seriesTitle,
  nextEpisodeNumber,
}: EpisodeUploadFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(`Episode ${nextEpisodeNumber}`);
  const [episodeNumber, setEpisodeNumber] = useState(nextEpisodeNumber);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const upload = async () => {
    if (!file || !title.trim()) {
      setError("Select a video file and enter a title.");
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);
    setStatus("Creating upload…");

    try {
      const { videoId, uploadUrl, apiKey } = await initBunnyUpload(
        `${seriesTitle} — ${title.trim()}`
      );

      setStatus("Uploading to Bunny…");
      setProgress(10);

      await putVideoToBunny(file, uploadUrl, apiKey, (pct) => {
        setProgress(10 + Math.round(pct * 0.7));
      });

      setStatus("Saving episode…");
      setProgress(90);

      await finalizeNewEpisode({
        seriesId,
        videoId,
        title: title.trim(),
        episodeNumber,
      });

      setProgress(100);
      setStatus("Done! Redirecting…");
      router.push(`/admin/series/${seriesId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStatus(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <AdminPageHeader
        title="Upload Episode"
        subtitle={seriesTitle}
        backHref={`/admin/series/${seriesId}`}
        backLabel="Back to series"
      />

      <div className="rw-admin-panel">
        <div
          className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.12] bg-black/40 p-6 transition hover:border-obsidian-red/40 hover:bg-white/[0.02]"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          {file ? (
            <p className="text-sm text-white">
              {file.name}
              <span className="mt-1 block text-xs text-zinc-500">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
                {file.size === 0 ? " — file not loaded locally; download from iCloud/Drive first" : ""}
              </span>
            </p>
          ) : (
            <p className="text-sm text-zinc-500">
              Drag & drop video file, or click to browse
            </p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="rw-form-section space-y-4">
        <label className="block space-y-1.5">
          <span className="rw-form-label">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rw-form-input"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="rw-form-label">Episode number</span>
          <input
            type="number"
            min={1}
            value={episodeNumber}
            onChange={(e) => setEpisodeNumber(Number(e.target.value))}
            className="rw-form-input"
          />
        </label>
      </div>

      {uploading && (
        <div className="rw-admin-panel space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-obsidian-red transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500">{status}</p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        disabled={uploading || !file}
        onClick={() => void upload()}
        className="rw-btn-primary min-h-11 px-6"
      >
        {uploading ? "Uploading…" : "Upload Episode"}
      </button>
    </div>
  );
}
