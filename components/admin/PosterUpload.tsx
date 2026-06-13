"use client";

import { useRef, useState } from "react";

interface PosterUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
}

export function PosterUpload({ label, value, onChange }: PosterUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      if (data.url) onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <span className="text-sm text-gray-400">{label}</span>
      <div
        className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] bg-zinc-950 p-4 transition hover:border-white/20"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) void upload(file);
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="max-h-32 rounded object-contain" />
        ) : (
          <p className="text-sm text-gray-500">
            {uploading ? "Uploading…" : "Click or drag image"}
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
