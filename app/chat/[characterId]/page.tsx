import { notFound, redirect } from "next/navigation";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { getOrCreateConversation, getHighestUnlockedEpisode } from "@/lib/chat/server";
import { createClient } from "@/lib/supabase/server";

interface ChatPageProps {
  params: { characterId: string };
  searchParams: { episode?: string; from?: string };
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextQuery = new URLSearchParams();
  if (searchParams.episode) nextQuery.set("episode", searchParams.episode);
  if (searchParams.from) nextQuery.set("from", searchParams.from);
  const nextPath = `/chat/${params.characterId}${
    nextQuery.toString() ? `?${nextQuery.toString()}` : ""
  }`;

  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: character } = await supabase
    .from("characters")
    .select("id, series_id, name, avatar_url, short_bio, is_active")
    .eq("id", params.characterId)
    .eq("is_active", true)
    .maybeSingle();

  if (!character) notFound();

  const { data: series } = await supabase
    .from("series")
    .select("title, slug, poster_url, banner_url")
    .eq("id", character.series_id)
    .maybeSingle();

  const seriesTitle = series?.title ?? "ReelWalia";
  const seriesSlug = series?.slug ?? searchParams.from ?? "";
  const seriesPosterUrl = series?.poster_url ?? series?.banner_url ?? null;

  const parsedEpisode = searchParams.episode ? Number(searchParams.episode) : null;
  const currentEpisodeNumber =
    parsedEpisode != null && Number.isFinite(parsedEpisode) && parsedEpisode > 0
      ? Math.floor(parsedEpisode)
      : null;

  const unlocked = await getHighestUnlockedEpisode(
    supabase,
    user.id,
    character.series_id,
    currentEpisodeNumber
  );

  const conversation = await getOrCreateConversation(
    supabase,
    user.id,
    character.id,
    unlocked
  );

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, role, content, bubble_index, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  const backHref = seriesSlug ? `/series/${seriesSlug}` : "/";

  return (
    <ChatScreen
      character={{
        id: character.id,
        name: character.name,
        avatar_url: character.avatar_url,
        short_bio: character.short_bio,
      }}
      seriesTitle={seriesTitle}
      seriesPosterUrl={seriesPosterUrl}
      backHref={backHref}
      currentEpisodeNumber={currentEpisodeNumber}
      initialMessages={
        messages?.map((m) => ({
          id: m.id,
          role: m.role as "user" | "character",
          content: m.content,
          createdAt: m.created_at,
        })) ?? []
      }
    />
  );
}
