"use client";

import { PosterUpload } from "@/components/admin/PosterUpload";

/** Avatar URL field with paste-or-upload (reuses posters bucket upload API). */
export function AvatarUrlField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="rw-form-label">Avatar URL</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or upload below"
          className="rw-form-input font-mono text-sm"
        />
      </label>
      <PosterUpload label="Or upload image" value={value} onChange={onChange} />
    </div>
  );
}
