import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveUnlockedEpisode } from "@/lib/chat/episode-gate";
import type { RelationshipScores } from "@/lib/chat/relationship";

export type ChatCharacter = {
  id: string;
  series_id: string;
  name: string;
  age: number | null;
  role: string | null;
  short_bio: string | null;
  personality_summary: string | null;
  avatar_url: string | null;
  is_active: boolean;
};

export type ChatMessageRow = {
  id: string;
  role: "user" | "character";
  content: string;
  bubble_index: number;
  created_at: string;
};

export async function getHighestUnlockedEpisode(
  supabase: SupabaseClient,
  userId: string,
  seriesId: string,
  currentEpisodeNumber?: number | null
): Promise<number> {
  const { data: episodes } = await supabase
    .from("episodes")
    .select("id, episode_number")
    .eq("series_id", seriesId);

  if (!episodes?.length) {
    return resolveUnlockedEpisode({
      history: [],
      currentEpisodeNumber,
    });
  }

  const episodeIds = episodes.map((e) => e.id);
  const numberById = new Map(episodes.map((e) => [e.id, e.episode_number]));

  const { data: history } = await supabase
    .from("watch_history")
    .select("episode_id, completed, progress_seconds")
    .eq("user_id", userId)
    .in("episode_id", episodeIds);

  const rows =
    history?.map((row) => ({
      episode_number: numberById.get(row.episode_id) ?? 0,
      completed: !!row.completed,
      progress_seconds: row.progress_seconds ?? 0,
    })) ?? [];

  return resolveUnlockedEpisode({
    history: rows,
    currentEpisodeNumber,
  });
}

export async function getOrCreateConversation(
  supabase: SupabaseClient,
  userId: string,
  characterId: string,
  unlockedThroughEpisode: number
): Promise<{
  id: string;
  unlocked_through_episode: number;
  memory_summary: string | null;
}> {
  const { data: existing } = await supabase
    .from("chat_conversations")
    .select("id, unlocked_through_episode, memory_summary")
    .eq("user_id", userId)
    .eq("character_id", characterId)
    .maybeSingle();

  if (existing) {
    const nextUnlocked = Math.max(
      existing.unlocked_through_episode ?? 0,
      unlockedThroughEpisode
    );
    if (nextUnlocked !== existing.unlocked_through_episode) {
      await supabase
        .from("chat_conversations")
        .update({ unlocked_through_episode: nextUnlocked })
        .eq("id", existing.id);
    }
    await supabase.from("relationship_scores").upsert(
      { conversation_id: existing.id },
      { onConflict: "conversation_id", ignoreDuplicates: true }
    );
    return {
      id: existing.id,
      unlocked_through_episode: nextUnlocked,
      memory_summary: existing.memory_summary,
    };
  }

  const { data: created, error } = await supabase
    .from("chat_conversations")
    .insert({
      user_id: userId,
      character_id: characterId,
      unlocked_through_episode: unlockedThroughEpisode,
    })
    .select("id, unlocked_through_episode, memory_summary")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create conversation");
  }

  await supabase.from("relationship_scores").upsert(
    { conversation_id: created.id },
    { onConflict: "conversation_id", ignoreDuplicates: true }
  );

  return created;
}

export async function getRelationshipScores(
  supabase: SupabaseClient,
  conversationId: string
): Promise<RelationshipScores> {
  const { data } = await supabase
    .from("relationship_scores")
    .select("trust, friendship, romance, suspicion, respect")
    .eq("conversation_id", conversationId)
    .maybeSingle();

  return {
    trust: data?.trust ?? 0,
    friendship: data?.friendship ?? 0,
    romance: data?.romance ?? 0,
    suspicion: data?.suspicion ?? 0,
    respect: data?.respect ?? 0,
  };
}

export async function listActiveCharactersForSeries(
  supabase: SupabaseClient,
  seriesId: string
): Promise<ChatCharacter[]> {
  const { data, error } = await supabase
    .from("characters")
    .select(
      "id, series_id, name, age, role, short_bio, personality_summary, avatar_url, is_active"
    )
    .eq("series_id", seriesId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    // Table may not exist until migration 023 is applied
    console.error("listActiveCharactersForSeries:", error.message);
    return [];
  }

  return (data ?? []) as ChatCharacter[];
}
