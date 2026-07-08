"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { EpisodeCaption } from "@/lib/types/database";

interface EpisodeCaptionsPanelProps {
  episodeId: string;
  episodeNumber: number;
  episodeTitle: string;
  initialCaptions: EpisodeCaption[];
  onClose: () => void;
}

export function EpisodeCaptionsPanel({
  episodeId,
  episodeNumber,
  episodeTitle,
  initialCaptions,
  onClose,
}: EpisodeCaptionsPanelProps) {
  const router = useRouter();
  const [captions, setCaptions] = useState(initialCaptions);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [removingCode, setRemovingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.name.toLowerCase().endsWith(".vtt") || f.name.toLowerCase().endsWith(".zip")
    );
    if (files.length) setSelectedFiles(files);
  };

  const uploadCaptions = async () => {
    if (!selectedFiles.length) return;
    setUploading(true);
    setError(null);
    setWarnings([]);
    setSuccess(null);

    try {
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append("files", file);
      }

      const res = await fetch(`/api/admin/episodes/${episodeId}/captions`, {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as {
        error?: string;
        attached?: EpisodeCaption[];
        warnings?: string[];
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Upload failed");
      }

      if (data.attached?.length) {
        setCaptions((prev) => {
          const next = [...prev];
          for (const row of data.attached!) {
            const idx = next.findIndex((c) => c.language_code === row.language_code);
            if (idx >= 0) next[idx] = row;
            else next.push(row);
          }
          return next.sort((a, b) => a.language_code.localeCompare(b.language_code));
        });
        setSuccess(`Attached ${data.attached.length} language(s)`);
        setSelectedFiles([]);
        router.refresh();
      }

      if (data.warnings?.length) {
        setWarnings(data.warnings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeCaption = async (languageCode: string) => {
    setRemovingCode(languageCode);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `/api/admin/episodes/${episodeId}/captions/${languageCode}`,
        { method: "DELETE" }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Remove failed");

      setCaptions((prev) => prev.filter((c) => c.language_code !== languageCode));
      setSuccess(`Removed ${languageCode.toUpperCase()}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setRemovingCode(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Episode {episodeNumber}: {episodeTitle}
      </p>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Attached Languages
        </h4>
        {captions.length === 0 ? (
          <p className="text-sm text-gray-500">No captions uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {captions.map((caption) => (
              <li
                key={caption.id}
                className="flex items-center justify-between rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium text-white">{caption.language_label}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    ({caption.language_code})
                  </span>
                </span>
                <button
                  type="button"
                  disabled={removingCode === caption.language_code || uploading}
                  onClick={() => void removeCaption(caption.language_code)}
                  className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  {removingCode === caption.language_code ? "Removing…" : "Remove"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Upload Captions
        </h4>
        <p className="mb-3 text-xs text-gray-500">
          Drop multiple .vtt files or a Studio ZIP export. Filenames must use language
          codes: en, es, fr, pt, am, de, nl, ja, ko, zh, ru, ar, sw.
        </p>
        <div
          className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] bg-black p-4"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          {selectedFiles.length ? (
            <ul className="max-h-24 w-full space-y-1 overflow-y-auto text-xs text-gray-300">
              {selectedFiles.map((f, i) => (
                <li key={`${f.name}-${i}`}>{f.name}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Drag & drop .vtt files or a .zip</p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".vtt,.zip,application/zip"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              setSelectedFiles(files);
            }}
          />
        </div>
      </div>

      {success && (
        <p className="text-sm text-emerald-400" role="status">
          {success}
        </p>
      )}
      {warnings.length > 0 && (
        <ul className="space-y-1 text-xs text-amber-400" role="status">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={uploading || !selectedFiles.length}
          onClick={() => void uploadCaptions()}
          className="rw-btn-primary text-sm"
        >
          {uploading ? "Uploading…" : "Upload Captions"}
        </button>
        <button
          type="button"
          disabled={uploading}
          onClick={onClose}
          className="rw-btn-secondary text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}
