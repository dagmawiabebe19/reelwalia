"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
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
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl uppercase">Upload Episode</h1>
        <Link
          href={`/admin/series/${seriesId}`}
          className="text-sm text-gray-400 hover:text-white"
        >
          Back
        </Link>
      </div>

      <p className="text-sm text-gray-400">{seriesTitle}</p>

      <div
        className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] bg-zinc-950 p-6"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        {file ? (
          <p className="text-sm">{file.name}</p>
        ) : (
          <p className="text-sm text-gray-500">Drag & drop video file, or click to browse</p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-gray-400">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-white/[0.08] bg-black px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="text-gray-400">Episode number</span>
        <input
          type="number"
          min={1}
          value={episodeNumber}
          onChange={(e) => setEpisodeNumber(Number(e.target.value))}
          className="w-full rounded-md border border-white/[0.08] bg-black px-3 py-2"
        />
      </label>

      {uploading && (
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-obsidian-red transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">{status}</p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        disabled={uploading || !file}
        onClick={() => void upload()}
        className="rw-btn-primary"
      >
        {uploading ? "Uploading…" : "Upload Episode"}
      </button>
    </div>
  );
}
