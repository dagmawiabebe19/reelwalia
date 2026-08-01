"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  saveWorldBible,
  type WorldBibleFormData,
} from "@/app/admin/characters/actions";
import { AdminPageHeader, AdminPanelHeading } from "@/components/admin/admin-ui";

function linesFromUnknown(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) =>
    typeof item === "string" ? item : JSON.stringify(item)
  );
}

function StringListField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="rw-form-label">{label}</span>
      <textarea
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
        rows={Math.min(10, Math.max(4, value.length + 1))}
        className="rw-form-textarea font-mono text-sm"
        placeholder="One item per line"
      />
    </label>
  );
}

export function WorldBibleForm({
  seriesId,
  seriesTitle,
  initial,
}: {
  seriesId: string;
  seriesTitle: string;
  initial: {
    world_rules?: unknown;
    locations?: unknown;
    important_objects?: unknown;
  } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [worldRules, setWorldRules] = useState(() =>
    linesFromUnknown(initial?.world_rules)
  );
  const [locations, setLocations] = useState(() =>
    linesFromUnknown(initial?.locations)
  );
  const [objects, setObjects] = useState(() =>
    linesFromUnknown(initial?.important_objects)
  );

  const submit = () => {
    setError(null);
    const data: WorldBibleFormData = {
      series_id: seriesId,
      world_rules: worldRules,
      locations,
      important_objects: objects,
    };
    startTransition(async () => {
      try {
        await saveWorldBible(data);
        setSavedAt(new Date().toLocaleTimeString());
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AdminPageHeader
        title="World bible"
        subtitle={seriesTitle}
        backHref="/admin/world"
        backLabel="Back to world bibles"
      />

      <AdminPanelHeading
        title="Series lore"
        subtitle="Upserts world_bible by series_id — world_rules, locations, important_objects."
      />

      <div className="rw-form-section space-y-4">
        <StringListField
          label="World rules"
          value={worldRules}
          onChange={setWorldRules}
        />
        <StringListField
          label="Locations"
          value={locations}
          onChange={setLocations}
        />
        <StringListField
          label="Important objects"
          value={objects}
          onChange={setObjects}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {savedAt && !error && (
        <p className="text-xs text-emerald-400">World bible saved at {savedAt}</p>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="rw-btn-primary min-h-11 px-6"
      >
        {pending ? "Saving…" : "Save world bible"}
      </button>
    </div>
  );
}
