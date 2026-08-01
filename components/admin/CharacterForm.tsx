"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteCharacter,
  saveCharacter,
  type CharacterFormData,
} from "@/app/admin/characters/actions";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { AvatarUrlField } from "@/components/admin/AvatarUrlField";

export type SeriesOption = { id: string; title: string; slug: string };

export function CharacterForm({
  initial,
  seriesOptions,
}: {
  initial?: Partial<CharacterFormData> & { id?: string };
  seriesOptions: SeriesOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [seriesId, setSeriesId] = useState(initial?.series_id ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [age, setAge] = useState(
    initial?.age != null ? String(initial.age) : ""
  );
  const [role, setRole] = useState(initial?.role ?? "");
  const [shortBio, setShortBio] = useState(initial?.short_bio ?? "");
  const [personality, setPersonality] = useState(
    initial?.personality_summary ?? ""
  );
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatar_url ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const submit = () => {
    setError(null);
    const ageNum = age.trim() === "" ? null : Number(age);
    if (ageNum != null && !Number.isFinite(ageNum)) {
      setError("Age must be a number");
      return;
    }

    const data: CharacterFormData = {
      id: initial?.id,
      series_id: seriesId,
      name,
      age: ageNum,
      role,
      short_bio: shortBio,
      personality_summary: personality,
      avatar_url: avatarUrl,
      is_active: isActive,
    };

    startTransition(async () => {
      try {
        const result = await saveCharacter(data);
        if (!initial?.id && result?.id) {
          router.push(`/admin/characters/${result.id}`);
          return;
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  };

  const onDelete = () => {
    if (!initial?.id) return;
    if (
      !window.confirm(
        `Delete ${name || "this character"}? This also removes their bible and chat history.`
      )
    ) {
      return;
    }
    setError(null);
    startDelete(async () => {
      try {
        await deleteCharacter(initial.id!);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AdminPageHeader
        title={initial?.id ? "Edit character" : "Add character"}
        backHref="/admin/characters"
        backLabel="Back to characters"
        subtitle={
          initial?.id
            ? "Updates the characters row. Bible is edited in the panel below."
            : "Creates the character and an empty bible row ready to fill."
        }
      />

      <div className="rw-form-section space-y-4">
        <label className="block space-y-1.5">
          <span className="rw-form-label">Series</span>
          <select
            value={seriesId}
            onChange={(e) => setSeriesId(e.target.value)}
            className="rw-form-select"
          >
            <option value="">Select series…</option>
            {seriesOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="rw-form-label">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rw-form-input"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="rw-form-label">Age</span>
            <input
              type="number"
              min={0}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="rw-form-input"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="rw-form-label">Role</span>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Lead / POV…"
              className="rw-form-input"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="rw-form-label">Short bio</span>
          <textarea
            value={shortBio}
            onChange={(e) => setShortBio(e.target.value)}
            rows={3}
            className="rw-form-textarea"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="rw-form-label">Personality summary</span>
          <textarea
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            rows={4}
            className="rw-form-textarea"
          />
          <span className="text-xs text-zinc-500">
            Lives on <code className="text-zinc-400">characters.personality_summary</code>
            , not the bible.
          </span>
        </label>

        <AvatarUrlField value={avatarUrl} onChange={setAvatarUrl} />

        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-obsidian-red"
          />
          Active (visible in Meet the Characters / promo when published)
        </label>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending || !name.trim() || !seriesId}
          onClick={submit}
          className="rw-btn-primary min-h-11 px-6"
        >
          {pending ? "Saving…" : initial?.id ? "Save character" : "Create character"}
        </button>
        {initial?.id && (
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className="rounded-lg border border-obsidian-red/40 px-4 py-2 text-sm font-semibold text-obsidian-red transition hover:bg-obsidian-red/10"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
}
