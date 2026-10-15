"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CommercialEditor } from "@/components/admin/commercials/CommercialEditor";
import { commercialClientLabel, type Commercial } from "@/lib/commercials/constants";
import { CommercialAdminError, adminFetch } from "@/lib/commercials/upload";

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5000);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-emerald-500/30 bg-zinc-950 px-4 py-3 text-sm text-emerald-200 shadow-2xl"
    >
      <span aria-hidden className="mt-0.5 text-emerald-400">✓</span>
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onDone} className="text-zinc-500 hover:text-white" aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

export function CommercialsManager({ commercials }: { commercials: Commercial[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Commercial | "new" | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const patch = async (c: Commercial, body: Record<string, unknown>, success: string) => {
    setPendingId(c.id);
    setError(null);
    try {
      await adminFetch(`/api/admin/commercials/${c.id}`, { method: "PATCH", body });
      setToast(success);
      router.refresh();
    } catch (e) {
      setError(e instanceof CommercialAdminError ? e.message : "Action failed. Please try again.");
    } finally {
      setPendingId(null);
    }
  };

  const remove = async (c: Commercial) => {
    if (!window.confirm(`Delete "${c.title}"? This also deletes its video and thumbnail files.`)) return;
    setPendingId(c.id);
    setError(null);
    try {
      const res = await adminFetch<{ filesRemoved: boolean }>(`/api/admin/commercials/${c.id}`, { method: "DELETE" });
      setToast(
        res.filesRemoved
          ? `Deleted “${c.title}” and its files.`
          : `Deleted “${c.title}”, but its storage files couldn't be removed. Delete them manually in Supabase → Storage.`
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof CommercialAdminError ? e.message : "Delete failed. Please try again.");
    } finally {
      setPendingId(null);
    }
  };

  const toastEl = toast && <Toast message={toast} onDone={() => setToast(null)} />;

  if (editing) {
    return (
      <>
        <CommercialEditor
          key={editing === "new" ? "new" : editing.id}
          commercial={editing === "new" ? null : editing}
          nextSortOrder={commercials.reduce((max, c) => Math.max(max, c.sort_order), 0) + 10}
          onSaved={(message) => {
            setEditing(null);
            setToast(message);
            router.refresh();
          }}
          onCancel={() => setEditing(null)}
        />
        {toastEl}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-obsidian-red/25 bg-obsidian-red/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-400">
          Lower sort order shows first. The first featured, published advertisement plays in the /ads hero (or the first published one if none is featured).
        </p>
        <button type="button" className="rw-btn-primary min-h-11 shrink-0 px-5 text-sm" onClick={() => setEditing("new")}>
          + Upload advertisement
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          {error}
        </div>
      )}

      {commercials.length === 0 ? (
        <div className="rw-admin-panel text-center text-sm text-zinc-500">
          No advertisements yet. The public page shows a &ldquo;New work dropping soon&rdquo; state until you publish one.
        </div>
      ) : (
        <div className="rw-admin-table-wrap overflow-x-auto">
          <table className="rw-admin-table min-w-[820px]">
            <thead>
              <tr>
                <th className="w-20">Preview</th>
                <th>Title</th>
                <th>Category</th>
                <th>Format</th>
                <th>Order</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {commercials.map((c) => {
                const busy = pendingId === c.id;
                return (
                  <tr key={c.id} className={busy ? "opacity-60" : ""}>
                    <td>
                      <div className="h-14 w-10 overflow-hidden rounded bg-zinc-800">
                        {c.thumbnail_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.thumbnail_url} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                    </td>
                    <td>
                      <p className="font-semibold text-white">{c.title}</p>
                      <p className="text-xs text-zinc-500">{commercialClientLabel(c)}</p>
                    </td>
                    <td className="text-zinc-300">{c.category ?? "—"}</td>
                    <td className="text-zinc-300">{c.aspect_ratio}</td>
                    <td>
                      <input
                        type="number"
                        defaultValue={c.sort_order}
                        disabled={busy}
                        aria-label={`Sort order for ${c.title}`}
                        className="w-20 rounded-md border border-white/10 bg-black px-2 py-1 text-sm tabular-nums text-zinc-200"
                        onBlur={(e) => {
                          const next = Math.round(Number(e.target.value));
                          if (Number.isFinite(next) && next !== c.sort_order) {
                            void patch(c, { sort_order: next }, `Moved “${c.title}” to position ${next}.`);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                      />
                    </td>
                    <td className="space-x-1.5 whitespace-nowrap">
                      <span className={c.is_published ? "rw-admin-pill-green" : "rw-admin-pill-zinc"}>
                        {c.is_published ? "Published" : "Hidden"}
                      </span>
                      {c.is_featured && <span className="rw-admin-pill-red">Featured</span>}
                    </td>
                    <td className="whitespace-nowrap text-right text-xs">
                      <button type="button" className="px-2 py-1 text-zinc-300 hover:text-white" disabled={busy} onClick={() => setEditing(c)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 text-zinc-300 hover:text-white"
                        disabled={busy}
                        onClick={() =>
                          void patch(c, { is_featured: !c.is_featured }, c.is_featured ? `“${c.title}” removed from the hero.` : `“${c.title}” is now featured in the hero.`)
                        }
                      >
                        {c.is_featured ? "Unfeature" : "Feature"}
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 text-zinc-300 hover:text-white"
                        disabled={busy}
                        onClick={() =>
                          void patch(c, { is_published: !c.is_published }, c.is_published ? `“${c.title}” hidden from /ads.` : `“${c.title}” published to /ads.`)
                        }
                      >
                        {c.is_published ? "Unpublish" : "Publish"}
                      </button>
                      <button type="button" className="px-2 py-1 text-red-400 hover:text-red-300" disabled={busy} onClick={() => void remove(c)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {toastEl}
    </div>
  );
}
