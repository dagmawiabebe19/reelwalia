import { notFound } from "next/navigation";
import { CharacterBibleForm } from "@/components/admin/CharacterBibleForm";
import { CharacterConversationsPanel } from "@/components/admin/CharacterConversationsPanel";
import { CharacterForm } from "@/components/admin/CharacterForm";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function AdminEditCharacterPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();
  const admin = createAdminClient();
  const characterId = params.id;

  const [
    { data: character },
    { data: bible },
    { data: series },
    { data: conversations },
  ] = await Promise.all([
    admin.from("characters").select("*").eq("id", characterId).maybeSingle(),
    admin
      .from("character_bible")
      .select("*")
      .eq("character_id", characterId)
      .maybeSingle(),
    admin.from("series").select("id, title, slug").order("title", { ascending: true }),
    admin
      .from("chat_conversations")
      .select("id, user_id, unlocked_through_episode, memory_summary, updated_at, created_at")
      .eq("character_id", characterId)
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  if (!character) notFound();

  const conversationIds = (conversations ?? []).map((c) => c.id);
  const messageCounts = new Map<string, number>();
  if (conversationIds.length) {
    const { data: messages } = await admin
      .from("chat_messages")
      .select("conversation_id")
      .in("conversation_id", conversationIds);
    for (const msg of messages ?? []) {
      const id = msg.conversation_id as string;
      messageCounts.set(id, (messageCounts.get(id) ?? 0) + 1);
    }
  }

  const seriesRow = (series ?? []).find((s) => s.id === character.series_id);

  return (
    <div className="space-y-10">
      <CharacterForm
        seriesOptions={series ?? []}
        initial={{
          id: character.id,
          series_id: character.series_id,
          name: character.name,
          age: character.age,
          role: character.role ?? "",
          short_bio: character.short_bio ?? "",
          personality_summary: character.personality_summary ?? "",
          avatar_url: character.avatar_url ?? "",
          is_active: character.is_active,
        }}
      />

      {seriesRow && (
        <p className="mx-auto max-w-2xl text-sm text-zinc-500">
          Series page:{" "}
          <Link
            href={`/series/${seriesRow.slug}`}
            className="text-obsidian-red hover:underline"
          >
            /series/{seriesRow.slug}
          </Link>
          {" · "}
          <Link
            href={`/admin/world/${seriesRow.id}`}
            className="text-obsidian-red hover:underline"
          >
            Edit world bible
          </Link>
        </p>
      )}

      <div className="mx-auto max-w-3xl border-t border-white/[0.08] pt-8">
        <CharacterBibleForm
          characterId={character.id}
          initial={bible as Record<string, unknown> | null}
        />
      </div>

      <div className="mx-auto max-w-3xl">
        <CharacterConversationsPanel
          rows={(conversations ?? []).map((row) => ({
            id: row.id,
            user_id: row.user_id,
            unlocked_through_episode: row.unlocked_through_episode,
            memory_summary: row.memory_summary,
            updated_at: row.updated_at,
            created_at: row.created_at,
            message_count: messageCounts.get(row.id) ?? 0,
          }))}
        />
      </div>
    </div>
  );
}
