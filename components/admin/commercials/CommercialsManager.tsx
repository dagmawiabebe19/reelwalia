"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CommercialEditor } from "@/components/admin/commercials/CommercialEditor";
import { deleteCommercial, setCommercialPublished } from "@/app/admin/commercials/actions";
import { commercialClientLabel, type Commercial } from "@/lib/commercials/constants";

export function CommercialsManager({ commercials }: { commercials: Commercial[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Commercial | "new" | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const run = (id: string, action: () => Promise<void>) => {
    setPendingId(id);
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      } finally {
        setPendingId(null);
      }
    });
  };

  if (editing) {
    return (
      <CommercialEditor
        key={editing === "new" ? "new" : editing.id}
        commercial={editing === "new" ? null : editing}
        nextSortOrder={commercials.reduce((max, c) => Math.max(max, c.sort_order), 0) + 10}
        onDone={() => {
          setEditing(null);
          router.refresh();
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Lower sort order shows first. The first featured, published commercial plays in the hero.
        </p>
        <button type="button" className="rw-btn-primary min-h-10 px-4 text-sm" onClick={() => setEditing("new")}>
          + New commercial
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {commercials.length === 0 ? (
        <div className="rw-admin-panel text-center text-sm text-zinc-500">
          No commercials yet. The public page shows a &ldquo;New work dropping soon&rdquo; state until you publish one.
        </div>
      ) : (
        <div className="rw-admin-table-wrap overflow-x-auto">
          <table className="rw-admin-table min-w-[760px]">
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
                    <td className="tabular-nums text-zinc-400">{c.sort_order}</td>
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
                        onClick={() => run(c.id, () => setCommercialPublished(c.id, !c.is_published))}
                      >
                        {c.is_published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 text-red-400 hover:text-red-300"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(`Delete "${c.title}"? This also deletes its video and thumbnail files.`)) {
                            run(c.id, () => deleteCommercial(c.id));
                          }
                        }}
                      >
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
    </div>
  );
}
