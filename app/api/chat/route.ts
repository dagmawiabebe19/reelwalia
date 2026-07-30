import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { parseBubbles } from "@/lib/chat/bubbles";
import {
  getAnthropic,
  getChatModel,
  maybeSummarizeMemory,
  selectRecentMessages,
} from "@/lib/chat/memory";
import { buildCharacterSystemPrompt } from "@/lib/chat/prompt";
import {
  applyRelationshipDeltas,
  UPDATE_RELATIONSHIP_TOOL,
  type RelationshipDeltas,
} from "@/lib/chat/relationship";
import {
  getHighestUnlockedEpisode,
  getOrCreateConversation,
  getRelationshipScores,
} from "@/lib/chat/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatBody = {
  characterId?: string;
  message?: string;
  currentEpisodeNumber?: number;
};

function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const rate = checkRateLimit(`chat:${user.id}`, 20, 60_000);
    if (!rate.ok) {
      return NextResponse.json(
        { error: "Too many messages. Try again shortly.", retryAfter: rate.retryAfterSeconds },
        { status: 429 }
      );
    }

    const body = (await request.json()) as ChatBody;
    const characterId = body.characterId?.trim();
    const message = body.message?.trim();
    const currentEpisodeNumber =
      typeof body.currentEpisodeNumber === "number" && body.currentEpisodeNumber > 0
        ? Math.floor(body.currentEpisodeNumber)
        : null;

    if (!characterId || !message) {
      return NextResponse.json(
        { error: "characterId and message are required" },
        { status: 400 }
      );
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    const { data: character, error: characterError } = await supabase
      .from("characters")
      .select(
        "id, series_id, name, age, role, short_bio, personality_summary, avatar_url, is_active"
      )
      .eq("id", characterId)
      .eq("is_active", true)
      .maybeSingle();

    if (characterError || !character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const [{ data: bible }, { data: world }, { data: series }] = await Promise.all([
      supabase.from("character_bible").select("*").eq("character_id", character.id).maybeSingle(),
      supabase.from("world_bible").select("*").eq("series_id", character.series_id).maybeSingle(),
      supabase.from("series").select("title").eq("id", character.series_id).maybeSingle(),
    ]);

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

    // Persist user message
    await supabase.from("chat_messages").insert({
      conversation_id: conversation.id,
      role: "user",
      content: message,
      bubble_index: 0,
    });

    const { data: historyRows } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    const allMessages = historyRows ?? [];
    await maybeSummarizeMemory({
      conversationId: conversation.id,
      characterName: character.name,
      existingSummary: conversation.memory_summary,
      messages: allMessages,
    });

    // Refresh summary if it was just written
    const { data: refreshed } = await supabase
      .from("chat_conversations")
      .select("memory_summary, unlocked_through_episode")
      .eq("id", conversation.id)
      .single();

    const scores = await getRelationshipScores(supabase, conversation.id);
    const system = buildCharacterSystemPrompt({
      name: character.name,
      age: character.age,
      role: character.role,
      shortBio: character.short_bio,
      personalitySummary: character.personality_summary,
      bible: bible
        ? {
            biography: bible.biography,
            timeline: bible.timeline,
            family: bible.family,
            enemies: bible.enemies,
            allies: bible.allies,
            past_events: bible.past_events,
            current_motivations: bible.current_motivations,
            speech_examples: bible.speech_examples,
            catchphrases: bible.catchphrases,
            goals: bible.goals,
            fears: bible.fears,
            secrets: bible.secrets,
            emotional_tendencies: bible.emotional_tendencies,
            episode_knowledge: bible.episode_knowledge as Record<string, unknown>,
          }
        : null,
      world: world
        ? {
            world_rules: world.world_rules,
            locations: world.locations,
            important_objects: world.important_objects,
          }
        : null,
      unlockedThroughEpisode:
        refreshed?.unlocked_through_episode ?? conversation.unlocked_through_episode,
      memorySummary: refreshed?.memory_summary ?? conversation.memory_summary,
      scores,
      seriesTitle: series?.title ?? "this series",
    });

    const recent = selectRecentMessages(allMessages);
    const anthropicMessages: Anthropic.MessageParam[] = recent.map((row) => ({
      role: row.role === "user" ? "user" : "assistant",
      content: row.content,
    }));

    const anthropic = getAnthropic();
    const model = getChatModel();

    let response = await anthropic.messages.create({
      model,
      max_tokens: 800,
      system,
      tools: [UPDATE_RELATIONSHIP_TOOL],
      messages: anthropicMessages,
    });

    let deltas: RelationshipDeltas = {};
    let textParts: string[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        textParts.push(block.text);
      } else if (block.type === "tool_use" && block.name === "update_relationship") {
        deltas = (block.input ?? {}) as RelationshipDeltas;
      }
    }

    // If the model stopped for tool use without text, continue once for the bubbles
    if (response.stop_reason === "tool_use" && textParts.join("").trim() === "") {
      const toolResults: Anthropic.MessageParam = {
        role: "user",
        content: response.content
          .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
          .map((b) => ({
            type: "tool_result" as const,
            tool_use_id: b.id,
            content: "ok",
          })),
      };

      response = await anthropic.messages.create({
        model,
        max_tokens: 800,
        system,
        tools: [UPDATE_RELATIONSHIP_TOOL],
        messages: [
          ...anthropicMessages,
          { role: "assistant", content: response.content },
          toolResults,
        ],
      });

      textParts = [];
      for (const block of response.content) {
        if (block.type === "text") textParts.push(block.text);
        if (block.type === "tool_use" && block.name === "update_relationship") {
          deltas = { ...deltas, ...((block.input ?? {}) as RelationshipDeltas) };
        }
      }
    }

    const nextScores = applyRelationshipDeltas(scores, deltas);
    await supabase
      .from("relationship_scores")
      .update(nextScores)
      .eq("conversation_id", conversation.id);

    const bubbles = parseBubbles(textParts.join("\n"));

    // Persist character bubbles
    await supabase.from("chat_messages").insert(
      bubbles.map((content, index) => ({
        conversation_id: conversation.id,
        role: "character" as const,
        content,
        bubble_index: index,
      }))
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            sseEncode("meta", {
              conversationId: conversation.id,
              unlockedThroughEpisode:
                refreshed?.unlocked_through_episode ??
                conversation.unlocked_through_episode,
            })
          )
        );

        for (let i = 0; i < bubbles.length; i++) {
          controller.enqueue(
            encoder.encode(
              sseEncode("bubble", {
                index: i,
                content: bubbles[i],
              })
            )
          );
          // Small pause between bubbles so the client typing indicator can show
          if (i < bubbles.length - 1) {
            await new Promise((r) => setTimeout(r, 350));
          }
        }

        controller.enqueue(encoder.encode(sseEncode("done", { ok: true })));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("chat error:", err);
    const message = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
