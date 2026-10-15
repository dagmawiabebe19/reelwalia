"use client";

import { useRef, useState, type DragEvent } from "react";
import { formatBytes } from "@/lib/commercials/upload";

export function CommercialDropzone({
  id,
  label,
  hint,
  accept,
  file,
  currentName,
  previewUrl,
  previewKind,
  progress,
  uploaded,
  disabled,
  onFile,
}: {
  id: string;
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  /** Name of the already-saved file when editing and nothing new is chosen. */
  currentName: string | null;
  previewUrl: string | null;
  previewKind: "video" | "image";
  progress: number | null;
  uploaded: boolean;
  disabled: boolean;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onFile(dropped);
  };

  return (
    <div>
      <p className="rw-form-label">{label}</p>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`commercial-dropzone relative mt-1 flex cursor-pointer flex-col gap-3 overflow-hidden rounded-xl border-2 border-dashed p-4 transition ${
          dragging
            ? "border-obsidian-red bg-obsidian-red/10"
            : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            if (chosen) onFile(chosen);
            e.target.value = "";
          }}
        />

        {previewUrl &&
          (previewKind === "video" ? (
            <video src={previewUrl} muted playsInline preload="metadata" className="max-h-56 w-full rounded-lg bg-black object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="max-h-44 w-full rounded-lg object-contain" />
          ))}

        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-300" aria-hidden>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            {file ? (
              <>
                <p className="truncate text-sm font-semibold text-white" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-zinc-500">
                  {formatBytes(file.size)}
                  {uploaded ? " · uploaded" : " · uploads when you save"}
                </p>
              </>
            ) : currentName ? (
              <>
                <p className="truncate text-sm font-semibold text-white">{currentName}</p>
                <p className="text-xs text-zinc-500">Current file · drop or click to replace</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white">Drop a file or click to choose</p>
                <p className="text-xs text-zinc-500">{hint}</p>
              </>
            )}
          </div>
          {(file || currentName) && (
            <span className="shrink-0 text-xs font-semibold text-zinc-400">Replace</span>
          )}
        </div>

        {progress !== null && (
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-obsidian-red transition-[width] duration-150" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
      </label>
    </div>
  );
}
