"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { EpisodeCaptionsPanel } from "@/components/admin/EpisodeCaptionsPanel";
import { uploadAndReplaceEpisode } from "@/lib/admin/episode-upload";
import type { EpisodeCaption } from "@/lib/types/database";

export interface AdminEpisode {
  id: string;
  episode_number: number;
  title: string;
  bunny_video_id: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  display_view_count: number | null;
}

interface EpisodeManagerProps {
  seriesId: string;
  seriesTitle: string;
  episodes: AdminEpisode[];
  nextEpisodeNumber: number;
  bunnyHealthFlags?: Record<string, string>;
  captionsByEpisode?: Record<string, EpisodeCaption[]>;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function EpisodeThumb({
  thumbnailUrl,
  episodeNumber,
}: {
  thumbnailUrl: string | null;
  episodeNumber: number;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(thumbnailUrl) && !failed;

  return (
    <div className="h-16 w-11 shrink-0 overflow-hidden rounded border border-white/[0.08] bg-zinc-900">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-gray-500">
          {episodeNumber}
        </div>
      )}
    </div>
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg rounded-xl border border-white/[0.08] bg-zinc-950 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg uppercase">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EpisodeManager({
  seriesId,
  seriesTitle,
  episodes: initialEpisodes,
  nextEpisodeNumber,
  bunnyHealthFlags = {},
  captionsByEpisode = {},
}: EpisodeManagerProps) {
  const router = useRouter();
  const [episodes, setEpisodes] = useState(initialEpisodes);

  const [replaceTarget, setReplaceTarget] = useState<AdminEpisode | null>(null);
  const [captionsTarget, setCaptionsTarget] = useState<AdminEpisode | null>(null);
  const [editTarget, setEditTarget] = useState<AdminEpisode | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminEpisode | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceProgress, setReplaceProgress] = useState(0);
  const [replaceStatus, setReplaceStatus] = useState<string | null>(null);
  const [replaceUploading, setReplaceUploading] = useState(false);

  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkProgress, setBulkProgress] = useState<
    { episodeNumber: number; status: string; percent: number }[]
  >([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewCountDrafts, setViewCountDrafts] = useState<Record<string, string>>({});
  const [viewCountSavingId, setViewCountSavingId] = useState<string | null>(null);

  const replaceFileRef = useRef<HTMLInputElement>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    router.refresh();
  };

  const openEdit = (ep: AdminEpisode) => {
    setEditTarget(ep);
    setEditTitle(ep.title);
    setActionError(null);
  };

  const getViewCountDraft = (ep: AdminEpisode) =>
    viewCountDrafts[ep.id] ??
    (ep.display_view_count != null ? String(ep.display_view_count) : "");

  const saveViewCount = async (ep: AdminEpisode) => {
    const raw = getViewCountDraft(ep).trim();
    const parsed: number | null =
      raw === "" ? null : Number.parseInt(raw, 10);

    if (raw !== "" && (parsed === null || Number.isNaN(parsed) || parsed < 0)) {
      setActionError("Display view count must be a non-negative integer or empty");
      return;
    }

    if (parsed === ep.display_view_count) return;

    setViewCountSavingId(ep.id);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/episodes/${ep.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_view_count: parsed }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setEpisodes((prev) =>
        prev.map((e) =>
          e.id === ep.id ? { ...e, display_view_count: parsed } : e
        )
      );
      setViewCountDrafts((prev) => {
        const next = { ...prev };
        delete next[ep.id];
        return next;
      });
      refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Display view count update failed"
      );
    } finally {
      setViewCountSavingId(null);
    }
  };

  const saveEdit = async () => {
    if (!editTarget || !editTitle.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/episodes/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setEpisodes((prev) =>
        prev.map((e) =>
          e.id === editTarget.id ? { ...e, title: editTitle.trim() } : e
        )
      );
      setEditTarget(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/episodes/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      setEpisodes((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmClear = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/episodes/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Clear failed");
      setEpisodes([]);
      setClearOpen(false);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Clear failed");
    } finally {
      setActionLoading(false);
    }
  };

  const onReplaceDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setReplaceFile(f);
  }, []);

  const runReplace = async () => {
    if (!replaceTarget || !replaceFile) return;
    setReplaceUploading(true);
    setReplaceProgress(0);
    setReplaceStatus(null);
    setActionError(null);

    try {
      await uploadAndReplaceEpisode({
        file: replaceFile,
        seriesTitle,
        episodeTitle: replaceTarget.title,
        episodeId: replaceTarget.id,
        onProgress: (percent, status) => {
          setReplaceProgress(percent);
          setReplaceStatus(status);
        },
      });
      setReplaceTarget(null);
      setReplaceFile(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Replace failed");
    } finally {
      setReplaceUploading(false);
    }
  };

  const onBulkDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("video/")
    );
    if (files.length) setBulkFiles(files.slice(0, 10));
  }, []);

  const runBulkReplace = async () => {
    if (!bulkFiles.length) return;
    setBulkUploading(true);
    setBulkError(null);

    const sortedEpisodes = [...episodes].sort(
      (a, b) => a.episode_number - b.episode_number
    );

    const progressState = bulkFiles.map((_, i) => ({
      episodeNumber: i + 1,
      status: "Pending",
      percent: 0,
    }));
    setBulkProgress(progressState);

    try {
      for (let i = 0; i < bulkFiles.length; i++) {
        const file = bulkFiles[i];
        const episodeNumber = i + 1;
        const target = sortedEpisodes.find((e) => e.episode_number === episodeNumber);

        if (!target) {
          progressState[i] = {
            episodeNumber,
            status: "No episode slot",
            percent: 0,
          };
          setBulkProgress([...progressState]);
          continue;
        }

        progressState[i] = { episodeNumber, status: "Uploading…", percent: 5 };
        setBulkProgress([...progressState]);

        try {
          await uploadAndReplaceEpisode({
            file,
            seriesTitle,
            episodeTitle: target.title,
            episodeId: target.id,
            onProgress: (percent, status) => {
              progressState[i] = { episodeNumber, status, percent };
              setBulkProgress([...progressState]);
            },
          });
          progressState[i] = { episodeNumber, status: "Done", percent: 100 };
          setBulkProgress([...progressState]);
        } catch (err) {
          progressState[i] = {
            episodeNumber,
            status: err instanceof Error ? err.message : "Failed",
            percent: 0,
          };
          setBulkProgress([...progressState]);
          throw err;
        }
      }

      setBulkOpen(false);
      setBulkFiles([]);
      refresh();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Bulk upload failed");
    } finally {
      setBulkUploading(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl space-y-4 border-t border-white/[0.08] pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl uppercase">Episodes</h2>
        <div className="flex flex-wrap gap-2">
          {episodes.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => {
                  setBulkOpen(true);
                  setBulkFiles([]);
                  setBulkProgress([]);
                  setBulkError(null);
                }}
                className="rw-btn-secondary text-sm"
              >
                Replace All Episodes
              </button>
              <button
                type="button"
                onClick={() => {
                  setClearOpen(true);
                  setActionError(null);
                }}
                className="rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-400 hover:bg-red-950/30"
              >
                Clear All Episodes
              </button>
            </>
          )}
          <Link
            href={`/admin/series/${seriesId}/episodes/new`}
            className="rw-btn-secondary text-sm"
          >
            Upload Episode
          </Link>
        </div>
      </div>

      {actionError && (
        <p className="text-sm text-red-400" role="alert">
          {actionError}
        </p>
      )}

      {!episodes.length ? (
        <p className="text-sm text-gray-400">No episodes uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-white/[0.08] rounded-lg border border-white/[0.08]">
          {episodes.map((ep) => (
            <li key={ep.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <EpisodeThumb
                  thumbnailUrl={ep.thumbnail_url}
                  episodeNumber={ep.episode_number}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    <span className="text-gray-400">#{ep.episode_number}</span>{" "}
                    {ep.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDuration(ep.duration_seconds)}
                    {ep.bunny_video_id
                      ? ` · ${ep.bunny_video_id.startsWith("demo-") ? "Demo" : "Bunny"}`
                      : " · No video"}
                  </p>
                  {bunnyHealthFlags[ep.id] && (
                    <p className="mt-1 text-xs text-amber-400" role="status">
                      {bunnyHealthFlags[ep.id]}
                    </p>
                  )}
                  {(captionsByEpisode[ep.id]?.length ?? 0) > 0 && (
                    <p className="mt-1 text-xs text-gray-400">
                      Captions:{" "}
                      {captionsByEpisode[ep.id]
                        .map((c) => c.language_label)
                        .join(", ")}
                    </p>
                  )}
                  <label className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-gray-400">Display View Count</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={getViewCountDraft(ep)}
                      onChange={(e) =>
                        setViewCountDrafts((prev) => ({
                          ...prev,
                          [ep.id]: e.target.value,
                        }))
                      }
                      onBlur={() => void saveViewCount(ep)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void saveViewCount(ep);
                        }
                      }}
                      placeholder="Not set"
                      className="w-28 rounded border border-white/[0.08] bg-black px-2 py-1 text-white"
                    />
                    {viewCountSavingId === ep.id && (
                      <span className="text-gray-500">Saving…</span>
                    )}
                    {ep.display_view_count != null && viewCountSavingId !== ep.id && (
                      <span className="text-gray-500">
                        Showing {ep.display_view_count.toLocaleString()} views
                      </span>
                    )}
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReplaceTarget(ep);
                    setReplaceFile(null);
                    setReplaceProgress(0);
                    setReplaceStatus(null);
                    setActionError(null);
                  }}
                  className="rounded-md border border-white/[0.08] px-3 py-1.5 text-xs hover:border-white/20"
                >
                  Replace Video
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCaptionsTarget(ep);
                    setActionError(null);
                  }}
                  className="rounded-md border border-white/[0.08] px-3 py-1.5 text-xs hover:border-white/20"
                >
                  Captions
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(ep)}
                  className="rounded-md border border-white/[0.08] px-3 py-1.5 text-xs hover:border-white/20"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(ep);
                    setActionError(null);
                  }}
                  className="rounded-md border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/20"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-gray-500">Next episode number: {nextEpisodeNumber}</p>

      {/* Captions Modal */}
      <Modal
        open={!!captionsTarget}
        title={`Captions / Subtitles — Ep ${captionsTarget?.episode_number ?? ""}`}
        onClose={() => setCaptionsTarget(null)}
      >
        {captionsTarget && (
          <EpisodeCaptionsPanel
            episodeId={captionsTarget.id}
            episodeNumber={captionsTarget.episode_number}
            episodeTitle={captionsTarget.title}
            initialCaptions={captionsByEpisode[captionsTarget.id] ?? []}
            onClose={() => {
              setCaptionsTarget(null);
              refresh();
            }}
          />
        )}
      </Modal>

      {/* Replace Video Modal */}
      <Modal
        open={!!replaceTarget}
        title={`Replace Video — Ep ${replaceTarget?.episode_number ?? ""}`}
        onClose={() => !replaceUploading && setReplaceTarget(null)}
      >
        <p className="mb-4 text-sm text-gray-400">{replaceTarget?.title}</p>
        <div
          className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] bg-black p-4"
          onClick={() => replaceFileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onReplaceDrop}
        >
          {replaceFile ? (
            <p className="text-sm">{replaceFile.name}</p>
          ) : (
            <p className="text-sm text-gray-500">Drag & drop video file</p>
          )}
          <input
            ref={replaceFileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {replaceUploading && (
          <div className="mt-4 space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-obsidian-red transition-all"
                style={{ width: `${replaceProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{replaceStatus}</p>
          </div>
        )}
        {actionError && <p className="mt-3 text-sm text-red-400">{actionError}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={replaceUploading || !replaceFile}
            onClick={() => void runReplace()}
            className="rw-btn-primary text-sm"
          >
            {replaceUploading ? "Uploading…" : "Upload & Replace"}
          </button>
          <button
            type="button"
            disabled={replaceUploading}
            onClick={() => setReplaceTarget(null)}
            className="rw-btn-secondary text-sm"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* Edit Title Modal */}
      <Modal
        open={!!editTarget}
        title="Edit Episode"
        onClose={() => !actionLoading && setEditTarget(null)}
      >
        <label className="block space-y-1 text-sm">
          <span className="text-gray-400">Title</span>
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full rounded-md border border-white/[0.08] bg-black px-3 py-2"
          />
        </label>
        {actionError && <p className="mt-3 text-sm text-red-400">{actionError}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={actionLoading || !editTitle.trim()}
            onClick={() => void saveEdit()}
            className="rw-btn-primary text-sm"
          >
            {actionLoading ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => setEditTarget(null)}
            className="rw-btn-secondary text-sm"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={!!deleteTarget}
        title="Delete Episode"
        onClose={() => !actionLoading && setDeleteTarget(null)}
      >
        <p className="text-sm text-gray-400">
          Delete episode {deleteTarget?.episode_number} ({deleteTarget?.title})? This
          removes the Bunny video and cannot be undone.
        </p>
        {actionError && <p className="mt-3 text-sm text-red-400">{actionError}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => void confirmDelete()}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500 disabled:opacity-50"
          >
            {actionLoading ? "Deleting…" : "Delete"}
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => setDeleteTarget(null)}
            className="rw-btn-secondary text-sm"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* Clear All Modal */}
      <Modal
        open={clearOpen}
        title="Clear All Episodes"
        onClose={() => !actionLoading && setClearOpen(false)}
      >
        <p className="text-sm text-gray-400">
          Delete all {episodes.length} episodes for this series? Bunny videos will be
          removed. Useful for clearing seeded placeholder content.
        </p>
        {actionError && <p className="mt-3 text-sm text-red-400">{actionError}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => void confirmClear()}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500 disabled:opacity-50"
          >
            {actionLoading ? "Clearing…" : "Clear All"}
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => setClearOpen(false)}
            className="rw-btn-secondary text-sm"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* Bulk Replace Modal */}
      <Modal
        open={bulkOpen}
        title="Replace All Episodes"
        onClose={() => !bulkUploading && setBulkOpen(false)}
      >
        <p className="mb-4 text-sm text-gray-400">
          Drop up to 10 video files. They upload one at a time: file 1 replaces episode
          1, file 2 replaces episode 2, etc.
        </p>
        <div
          className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] bg-black p-4"
          onClick={() => bulkFileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onBulkDrop}
        >
          {bulkFiles.length ? (
            <p className="text-sm">{bulkFiles.length} file(s) selected</p>
          ) : (
            <p className="text-sm text-gray-500">Drag & drop up to 10 video files</p>
          )}
          <input
            ref={bulkFileRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []).slice(0, 10);
              setBulkFiles(files);
            }}
          />
        </div>
        {bulkFiles.length > 0 && (
          <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-xs text-gray-400">
            {bulkFiles.map((f, i) => (
              <li key={`${f.name}-${i}`}>
                Ep {i + 1}: {f.name}
              </li>
            ))}
          </ul>
        )}
        {bulkProgress.length > 0 && (
          <ul className="mt-4 space-y-2">
            {bulkProgress.map((item) => (
              <li key={item.episodeNumber} className="text-xs">
                <div className="mb-1 flex justify-between text-gray-400">
                  <span>Episode {item.episodeNumber}</span>
                  <span>{item.status}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-obsidian-red transition-all"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        {bulkError && <p className="mt-3 text-sm text-red-400">{bulkError}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={bulkUploading || !bulkFiles.length}
            onClick={() => void runBulkReplace()}
            className="rw-btn-primary text-sm"
          >
            {bulkUploading ? "Uploading…" : "Start Bulk Replace"}
          </button>
          <button
            type="button"
            disabled={bulkUploading}
            onClick={() => setBulkOpen(false)}
            className="rw-btn-secondary text-sm"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </section>
  );
}
