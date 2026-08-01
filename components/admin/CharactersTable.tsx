"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleCharacterActive } from "@/app/admin/characters/actions";

export type CharacterListRow = {
  id: string;
  name: string;
  series_id: string;
  seriesTitle: string;
  seriesSlug: string;
  is_active: boolean;
  has_bible: boolean;
  avatar_url: string | null;
  created_at: string;
};

export function CharactersTable({
  rows,
  seriesOptions,
  selectedSeriesId,
}: {
  rows: CharacterListRow[];
  seriesOptions: { id: string; title: string }[];
  selectedSeriesId: string;
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <span>Filter by series</span>
          <select
            className="rw-form-select w-auto min-w-[200px]"
            value={selectedSeriesId}
            onChange={(e) => {
              const value = e.target.value;
              router.push(
                value
                  ? `/admin/characters?series=${encodeURIComponent(value)}`
                  : "/admin/characters"
              );
            }}
          >
            <option value="">All series</option>
            {seriesOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-zinc-500">
          {rows.length} character{rows.length === 1 ? "" : "s"}
        </p>
      </div>

      {!rows.length ? (
        <div className="rw-admin-panel">
          <p className="text-sm text-zinc-400">
            No characters yet. Add one to start populating chat.
          </p>
        </div>
      ) : (
        <>
          <div className="rw-admin-table-wrap hidden md:block">
            <table className="rw-admin-table">
              <thead>
                <tr>
                  <th className="w-14">Avatar</th>
                  <th>Name</th>
                  <th>Series</th>
                  <th>Bible</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <CharacterRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-white/[0.08] rounded-xl border border-white/[0.08] md:hidden">
            {rows.map((row) => (
              <li key={row.id} className="p-4">
                <div className="flex items-start gap-3">
                  <AvatarThumb name={row.name} url={row.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/characters/${row.id}`}
                      className="font-medium text-white hover:text-obsidian-red"
                    >
                      {row.name}
                    </Link>
                    <p className="text-xs text-zinc-500">{row.seriesTitle}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <BiblePill hasBible={row.has_bible} />
                      <ActiveToggle
                        characterId={row.id}
                        isActive={row.is_active}
                      />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function CharacterRow({ row }: { row: CharacterListRow }) {
  return (
    <tr>
      <td>
        <AvatarThumb name={row.name} url={row.avatar_url} />
      </td>
      <td>
        <Link
          href={`/admin/characters/${row.id}`}
          className="font-medium text-white hover:text-obsidian-red"
        >
          {row.name}
        </Link>
      </td>
      <td className="text-zinc-300">
        <span className="block">{row.seriesTitle}</span>
        <span className="text-xs text-zinc-600">/{row.seriesSlug}</span>
      </td>
      <td>
        <BiblePill hasBible={row.has_bible} />
      </td>
      <td>
        <ActiveToggle characterId={row.id} isActive={row.is_active} />
      </td>
      <td className="text-right">
        <Link
          href={`/admin/characters/${row.id}`}
          className="text-sm text-zinc-400 hover:text-white"
        >
          Edit →
        </Link>
      </td>
    </tr>
  );
}

function AvatarThumb({ name, url }: { name: string; url: string | null }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const show =
    !!url?.trim() && !url.includes("<PLACEHOLDER");

  return (
    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-obsidian-red/30 bg-zinc-900 text-sm font-semibold text-obsidian-red">
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url!} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}

function BiblePill({ hasBible }: { hasBible: boolean }) {
  return hasBible ? (
    <span className="rw-admin-pill-green">Bible</span>
  ) : (
    <span className="rw-admin-pill-zinc">No bible</span>
  );
}

function ActiveToggle({
  characterId,
  isActive,
}: {
  characterId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={isActive}
          disabled={pending}
          className="h-4 w-4 accent-obsidian-red"
          onChange={(e) => {
            const next = e.target.checked;
            setError(null);
            startTransition(async () => {
              try {
                await toggleCharacterActive(characterId, next);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Update failed");
              }
            });
          }}
        />
        {isActive ? "Active" : "Off"}
      </label>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
