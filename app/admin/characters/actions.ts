"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type CharacterFormData = {
  id?: string;
  series_id: string;
  name: string;
  age: number | null;
  role: string;
  short_bio: string;
  personality_summary: string;
  avatar_url: string;
  is_active: boolean;
};

export type SpeechExampleInput = {
  register: string;
  line: string;
};

export type EpisodeKnowledgeEntry = {
  episode: string;
  knowledge: string;
};

export type CharacterBibleFormData = {
  character_id: string;
  speech_examples: SpeechExampleInput[];
  catchphrases: string[];
  emotional_tendencies: string;
  biography: string;
  timeline: string[];
  family: string[];
  allies: string[];
  enemies: string[];
  past_events: string[];
  current_motivations: string[];
  goals: string[];
  fears: string[];
  secrets: string[];
  episode_knowledge: EpisodeKnowledgeEntry[];
};

export type WorldBibleFormData = {
  series_id: string;
  world_rules: string[];
  locations: string[];
  important_objects: string[];
};

function revalidateCharacterPaths(seriesId?: string | null, characterId?: string | null) {
  revalidatePath("/admin/characters");
  revalidatePath("/");
  if (characterId) {
    revalidatePath(`/admin/characters/${characterId}`);
    revalidatePath(`/chat/${characterId}`);
  }
  if (seriesId) {
    revalidatePath(`/admin/world/${seriesId}`);
  }
  // Series/watch Meet-the-Characters surfaces
  revalidatePath("/series", "layout");
  revalidatePath("/watch", "layout");
}

function parseBiographyJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    return { notes: trimmed };
  }
}

function emotionalTendenciesToJsonb(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  // Prefer plain prose (matches seed: jsonb string). If admin pastes JSON, keep it.
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

function episodeKnowledgeToJsonb(
  entries: EpisodeKnowledgeEntry[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of entries) {
    const key = entry.episode.trim();
    const value = entry.knowledge.trim();
    if (!key || !value) continue;
    if (!/^\d+$/.test(key)) {
      throw new Error(`Episode number must be digits only (got "${key}")`);
    }
    out[key] = value;
  }
  return out;
}

export async function saveCharacter(data: CharacterFormData) {
  await requireAdmin();
  const admin = createAdminClient();

  const name = data.name.trim();
  if (!name) throw new Error("Name is required");
  if (!data.series_id) throw new Error("Series is required");

  const payload = {
    series_id: data.series_id,
    name,
    age: data.age != null && Number.isFinite(data.age) ? data.age : null,
    role: data.role.trim() || null,
    short_bio: data.short_bio.trim() || null,
    personality_summary: data.personality_summary.trim() || null,
    avatar_url: data.avatar_url.trim() || null,
    is_active: data.is_active,
  };

  if (data.id) {
    const { error } = await admin
      .from("characters")
      .update(payload)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    revalidateCharacterPaths(data.series_id, data.id);
    return { id: data.id };
  }

  const { data: inserted, error } = await admin
    .from("characters")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Ensure a bible row exists for the editor (upsert-safe)
  const { error: bibleError } = await admin.from("character_bible").upsert(
    {
      character_id: inserted.id,
      biography: {},
      timeline: [],
      family: [],
      enemies: [],
      allies: [],
      past_events: [],
      current_motivations: [],
      speech_examples: [],
      catchphrases: [],
      goals: [],
      fears: [],
      secrets: [],
      emotional_tendencies: {},
      episode_knowledge: {},
    },
    { onConflict: "character_id" }
  );
  if (bibleError) throw new Error(bibleError.message);

  revalidateCharacterPaths(data.series_id, inserted.id);
  return { id: inserted.id as string };
}

export async function toggleCharacterActive(characterId: string, isActive: boolean) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: row, error: fetchError } = await admin
    .from("characters")
    .select("id, series_id")
    .eq("id", characterId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!row) throw new Error("Character not found");

  const { error } = await admin
    .from("characters")
    .update({ is_active: isActive })
    .eq("id", characterId);
  if (error) throw new Error(error.message);

  revalidateCharacterPaths(row.series_id, characterId);
}

export async function saveCharacterBible(data: CharacterBibleFormData) {
  await requireAdmin();
  const admin = createAdminClient();

  if (!data.character_id) throw new Error("character_id is required");

  const speech_examples = data.speech_examples
    .map((e) => ({
      register: e.register.trim(),
      line: e.line.trim(),
    }))
    .filter((e) => e.register || e.line);

  const payload = {
    character_id: data.character_id,
    speech_examples,
    catchphrases: data.catchphrases.map((s) => s.trim()).filter(Boolean),
    emotional_tendencies: emotionalTendenciesToJsonb(data.emotional_tendencies),
    biography: parseBiographyJson(data.biography),
    timeline: data.timeline.map((s) => s.trim()).filter(Boolean),
    family: data.family.map((s) => s.trim()).filter(Boolean),
    allies: data.allies.map((s) => s.trim()).filter(Boolean),
    enemies: data.enemies.map((s) => s.trim()).filter(Boolean),
    past_events: data.past_events.map((s) => s.trim()).filter(Boolean),
    current_motivations: data.current_motivations
      .map((s) => s.trim())
      .filter(Boolean),
    goals: data.goals.map((s) => s.trim()).filter(Boolean),
    fears: data.fears.map((s) => s.trim()).filter(Boolean),
    secrets: data.secrets.map((s) => s.trim()).filter(Boolean),
    episode_knowledge: episodeKnowledgeToJsonb(data.episode_knowledge),
  };

  const { error } = await admin
    .from("character_bible")
    .upsert(payload, { onConflict: "character_id" });
  if (error) throw new Error(error.message);

  const { data: character } = await admin
    .from("characters")
    .select("series_id")
    .eq("id", data.character_id)
    .maybeSingle();

  revalidateCharacterPaths(character?.series_id, data.character_id);
}

export async function saveWorldBible(data: WorldBibleFormData) {
  await requireAdmin();
  const admin = createAdminClient();

  if (!data.series_id) throw new Error("series_id is required");

  const payload = {
    series_id: data.series_id,
    world_rules: data.world_rules.map((s) => s.trim()).filter(Boolean),
    locations: data.locations.map((s) => s.trim()).filter(Boolean),
    important_objects: data.important_objects
      .map((s) => s.trim())
      .filter(Boolean),
  };

  const { error } = await admin
    .from("world_bible")
    .upsert(payload, { onConflict: "series_id" });
  if (error) throw new Error(error.message);

  revalidateCharacterPaths(data.series_id);
  revalidatePath("/admin/world");
}

export async function deleteCharacter(characterId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("characters")
    .select("series_id")
    .eq("id", characterId)
    .maybeSingle();

  const { error } = await admin.from("characters").delete().eq("id", characterId);
  if (error) throw new Error(error.message);

  revalidateCharacterPaths(row?.series_id, characterId);
  redirect("/admin/characters");
}
