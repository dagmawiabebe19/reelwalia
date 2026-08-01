"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  saveCharacterBible,
  type CharacterBibleFormData,
  type EpisodeKnowledgeEntry,
  type SpeechExampleInput,
} from "@/app/admin/characters/actions";
import { AdminPanelHeading } from "@/components/admin/admin-ui";

function linesFromUnknown(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) =>
    typeof item === "string" ? item : JSON.stringify(item)
  );
}

function biographyToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value as object).length === 0
  ) {
    return "";
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "notes" in value &&
    typeof (value as { notes: unknown }).notes === "string" &&
    Object.keys(value as object).length === 1
  ) {
    return (value as { notes: string }).notes;
  }
  return JSON.stringify(value, null, 2);
}

function emotionalToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value as object).length === 0
  ) {
    return "";
  }
  return typeof value === "object"
    ? JSON.stringify(value, null, 2)
    : String(value);
}

function speechFromUnknown(value: unknown): SpeechExampleInput[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { register?: unknown; line?: unknown };
      return {
        register: typeof row.register === "string" ? row.register : "",
        line: typeof row.line === "string" ? row.line : "",
      };
    })
    .filter((row): row is SpeechExampleInput => row != null);
}

function episodeFromUnknown(value: unknown): EpisodeKnowledgeEntry[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .map(([episode, knowledge]) => ({
      episode,
      knowledge: typeof knowledge === "string" ? knowledge : JSON.stringify(knowledge),
    }))
    .sort((a, b) => Number(a.episode) - Number(b.episode));
}

function StringListField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="rw-form-label">{label}</span>
      <textarea
        value={value.join("\n")}
        onChange={(e) =>
          onChange(e.target.value.split("\n").map((line) => line))
        }
        rows={Math.min(8, Math.max(3, value.length + 1))}
        className="rw-form-textarea font-mono text-sm"
        placeholder="One item per line"
      />
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export function CharacterBibleForm({
  characterId,
  initial,
}: {
  characterId: string;
  initial: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [speechExamples, setSpeechExamples] = useState<SpeechExampleInput[]>(
    () => {
      const rows = speechFromUnknown(initial?.speech_examples);
      return rows.length ? rows : [{ register: "", line: "" }];
    }
  );
  const [catchphrases, setCatchphrases] = useState(() =>
    linesFromUnknown(initial?.catchphrases)
  );
  const [emotional, setEmotional] = useState(() =>
    emotionalToText(initial?.emotional_tendencies)
  );
  const [biography, setBiography] = useState(() =>
    biographyToText(initial?.biography)
  );
  const [timeline, setTimeline] = useState(() =>
    linesFromUnknown(initial?.timeline)
  );
  const [family, setFamily] = useState(() => linesFromUnknown(initial?.family));
  const [allies, setAllies] = useState(() => linesFromUnknown(initial?.allies));
  const [enemies, setEnemies] = useState(() =>
    linesFromUnknown(initial?.enemies)
  );
  const [pastEvents, setPastEvents] = useState(() =>
    linesFromUnknown(initial?.past_events)
  );
  const [motivations, setMotivations] = useState(() =>
    linesFromUnknown(initial?.current_motivations)
  );
  const [goals, setGoals] = useState(() => linesFromUnknown(initial?.goals));
  const [fears, setFears] = useState(() => linesFromUnknown(initial?.fears));
  const [secrets, setSecrets] = useState(() =>
    linesFromUnknown(initial?.secrets)
  );
  const [episodeKnowledge, setEpisodeKnowledge] = useState<
    EpisodeKnowledgeEntry[]
  >(() => {
    const rows = episodeFromUnknown(initial?.episode_knowledge);
    return rows.length ? rows : [{ episode: "1", knowledge: "" }];
  });

  const submit = () => {
    setError(null);
    const data: CharacterBibleFormData = {
      character_id: characterId,
      speech_examples: speechExamples,
      catchphrases,
      emotional_tendencies: emotional,
      biography,
      timeline,
      family,
      allies,
      enemies,
      past_events: pastEvents,
      current_motivations: motivations,
      goals,
      fears,
      secrets,
      episode_knowledge: episodeKnowledge,
    };

    startTransition(async () => {
      try {
        await saveCharacterBible(data);
        setSavedAt(new Date().toLocaleTimeString());
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  };

  return (
    <div className="space-y-6">
      <AdminPanelHeading
        title="Character bible"
        subtitle="Upserts the character_bible row by character_id. Allies (not friends). emotional_tendencies is jsonb."
      />

      <div className="rw-form-section space-y-4">
        <h3 className="rw-form-section-title">Speech</h3>
        <div className="space-y-3">
          {speechExamples.map((row, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-lg border border-white/[0.08] bg-black/40 p-3 sm:grid-cols-[1fr_2fr_auto]"
            >
              <input
                value={row.register}
                onChange={(e) => {
                  const next = [...speechExamples];
                  next[index] = { ...row, register: e.target.value };
                  setSpeechExamples(next);
                }}
                placeholder="Register (e.g. court / perfect bride)"
                className="rw-form-input text-sm"
              />
              <input
                value={row.line}
                onChange={(e) => {
                  const next = [...speechExamples];
                  next[index] = { ...row, line: e.target.value };
                  setSpeechExamples(next);
                }}
                placeholder="Line"
                className="rw-form-input text-sm"
              />
              <button
                type="button"
                className="rounded-md border border-white/[0.12] px-3 py-2 text-xs text-zinc-400 hover:text-white"
                onClick={() =>
                  setSpeechExamples(speechExamples.filter((_, i) => i !== index))
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-obsidian-red hover:underline"
            onClick={() =>
              setSpeechExamples([...speechExamples, { register: "", line: "" }])
            }
          >
            + Add speech example
          </button>
        </div>

        <StringListField
          label="Catchphrases"
          value={catchphrases}
          onChange={setCatchphrases}
        />

        <label className="block space-y-1.5">
          <span className="rw-form-label">Emotional tendencies</span>
          <textarea
            value={emotional}
            onChange={(e) => setEmotional(e.target.value)}
            rows={4}
            className="rw-form-textarea"
            placeholder="Prose description of emotional defaults…"
          />
          <span className="text-xs text-zinc-500">
            Stored as jsonb (plain text becomes a JSON string; paste JSON object if needed).
          </span>
        </label>
      </div>

      <div className="rw-form-section space-y-4">
        <h3 className="rw-form-section-title">Episode knowledge</h3>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Only include what the character knows <strong>AS OF</strong> this
          episode — never future spoilers.
        </div>
        <div className="space-y-3">
          {episodeKnowledge.map((row, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-lg border border-white/[0.08] bg-black/40 p-3 sm:grid-cols-[100px_1fr_auto]"
            >
              <input
                value={row.episode}
                onChange={(e) => {
                  const next = [...episodeKnowledge];
                  next[index] = { ...row, episode: e.target.value };
                  setEpisodeKnowledge(next);
                }}
                placeholder="Ep #"
                className="rw-form-input font-mono text-sm"
              />
              <textarea
                value={row.knowledge}
                onChange={(e) => {
                  const next = [...episodeKnowledge];
                  next[index] = { ...row, knowledge: e.target.value };
                  setEpisodeKnowledge(next);
                }}
                rows={3}
                placeholder="What they know as of this episode…"
                className="rw-form-textarea text-sm"
              />
              <button
                type="button"
                className="h-fit rounded-md border border-white/[0.12] px-3 py-2 text-xs text-zinc-400 hover:text-white"
                onClick={() =>
                  setEpisodeKnowledge(
                    episodeKnowledge.filter((_, i) => i !== index)
                  )
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-obsidian-red hover:underline"
            onClick={() => {
              const max = episodeKnowledge.reduce((m, row) => {
                const n = Number(row.episode);
                return Number.isFinite(n) ? Math.max(m, n) : m;
              }, 0);
              setEpisodeKnowledge([
                ...episodeKnowledge,
                { episode: String(max + 1 || 1), knowledge: "" },
              ]);
            }}
          >
            + Add episode
          </button>
        </div>
      </div>

      <div className="rw-form-section space-y-4">
        <h3 className="rw-form-section-title">Lore (TODO fields)</h3>
        <label className="block space-y-1.5">
          <span className="rw-form-label">Biography</span>
          <textarea
            value={biography}
            onChange={(e) => setBiography(e.target.value)}
            rows={4}
            className="rw-form-textarea font-mono text-sm"
            placeholder='Prose notes, or JSON object e.g. { "summary": "…" }'
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <StringListField label="Timeline" value={timeline} onChange={setTimeline} />
          <StringListField label="Family" value={family} onChange={setFamily} />
          <StringListField label="Allies" value={allies} onChange={setAllies} />
          <StringListField label="Enemies" value={enemies} onChange={setEnemies} />
          <StringListField
            label="Past events"
            value={pastEvents}
            onChange={setPastEvents}
          />
          <StringListField
            label="Current motivations"
            value={motivations}
            onChange={setMotivations}
          />
          <StringListField label="Goals" value={goals} onChange={setGoals} />
          <StringListField label="Fears" value={fears} onChange={setFears} />
          <StringListField label="Secrets" value={secrets} onChange={setSecrets} />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {savedAt && !error && (
        <p className="text-xs text-emerald-400">Bible saved at {savedAt}</p>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="rw-btn-primary min-h-11 px-6"
      >
        {pending ? "Saving bible…" : "Save bible"}
      </button>
    </div>
  );
}
