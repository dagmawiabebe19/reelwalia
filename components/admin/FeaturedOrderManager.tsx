"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  reorderFeaturedSeries,
  setSeriesFeatured,
} from "@/app/admin/actions";
import { SeriesCoverThumb } from "@/components/admin/SeriesCoverThumb";
import { SeriesStatusPill } from "@/components/admin/admin-ui";
import type { SeriesStatus } from "@/lib/types/database";

export type FeaturedOrderRow = {
  id: string;
  title: string;
  slug: string;
  status: SeriesStatus;
  poster_url: string | null;
  genre: string[];
  featured_order: number | null;
};

export type FeaturedCandidate = {
  id: string;
  title: string;
  slug: string;
  status: SeriesStatus;
  poster_url: string | null;
  genre: string[];
};

export function FeaturedOrderManager({
  initialFeatured,
  candidates,
}: {
  initialFeatured: FeaturedOrderRow[];
  candidates: FeaturedCandidate[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialFeatured);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addId, setAddId] = useState("");

  const persistOrder = (next: FeaturedOrderRow[]) => {
    setItems(next);
    setError(null);
    startTransition(async () => {
      try {
        await reorderFeaturedSeries(next.map((row) => row.id));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reorder failed");
        router.refresh();
      }
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    persistOrder(next);
  };

  const remove = (id: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await setSeriesFeatured(id, false);
        setItems((prev) => prev.filter((row) => row.id !== id));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Remove failed");
        router.refresh();
      }
    });
  };

  const add = () => {
    if (!addId) return;
    setError(null);
    startTransition(async () => {
      try {
        await setSeriesFeatured(addId, true);
        setAddId("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Add failed");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="rw-admin-panel space-y-4">
        <div>
          <h2 className="font-display text-lg uppercase tracking-wide text-white">
            Current Featured order
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Lower position appears first on the homepage hero. Changes save
            immediately and show on the next page load — no redeploy.
          </p>
        </div>

        {!items.length ? (
          <p className="text-sm text-zinc-400">
            No featured titles yet. Add one below.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.08] rounded-xl border border-white/[0.08]">
            {items.map((row, index) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
              >
                <span className="w-8 shrink-0 text-center text-sm font-semibold tabular-nums text-zinc-500">
                  {index + 1}
                </span>
                <SeriesCoverThumb
                  title={row.title}
                  posterUrl={row.poster_url}
                  genres={row.genre}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{row.title}</p>
                  <p className="text-xs text-zinc-500">/{row.slug}</p>
                  <div className="mt-1">
                    <SeriesStatusPill status={row.status} />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    disabled={pending || index === 0}
                    onClick={() => move(index, -1)}
                    className="rounded-md border border-white/[0.12] px-2.5 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Move ${row.title} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={pending || index === items.length - 1}
                    onClick={() => move(index, 1)}
                    className="rounded-md border border-white/[0.12] px-2.5 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Move ${row.title} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(row.id)}
                    className="rounded-md border border-white/[0.12] px-2.5 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rw-admin-panel space-y-4">
        <div>
          <h2 className="font-display text-lg uppercase tracking-wide text-white">
            Add to Featured
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Appends to the end of the Featured list. You can also toggle Featured
            on a series edit page.
          </p>
        </div>

        {!candidates.length ? (
          <p className="text-sm text-zinc-400">
            Every catalog title is already featured (or none exist).
          </p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={addId}
              onChange={(e) => setAddId(e.target.value)}
              className="rw-input w-full flex-1"
              disabled={pending}
            >
              <option value="">Select a title…</option>
              {candidates.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.title} ({row.status.replace(/_/g, " ")})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending || !addId}
              onClick={add}
              className="rw-btn-primary disabled:opacity-50"
            >
              Add to Featured
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
