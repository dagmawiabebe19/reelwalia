import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const MEMORY_THRESHOLD = 15;
const RECENT_KEEP = 10;

function getChatModel(): string {
  return process.env.CHAT_MODEL?.trim() || "claude-sonnet-5";
}

function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  return new Anthropic({ apiKey });
}

/**
 * If the conversation has grown past MEMORY_THRESHOLD messages, summarize older
 * turns into memory_summary (service-role write) and return how many recent
 * messages the live prompt should keep.
 */
export async function maybeSummarizeMemory(params: {
  conversationId: string;
  characterName: string;
  existingSummary: string | null;
  messages: Array<{ role: string; content: string }>;
}): Promise<void> {
  if (params.messages.length <= MEMORY_THRESHOLD) return;

  const older = params.messages.slice(0, -RECENT_KEEP);
  if (older.length === 0) return;

  const transcript = older
    .map((m) => `${m.role === "user" ? "User" : params.characterName}: ${m.content}`)
    .join("\n");

  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: getChatModel(),
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Summarize this chat history for long-term memory. Include: names mentioned, promises made, key choices, emotional tone, and relationship state. Be concise (under 200 words).\n\nPrior summary:\n${params.existingSummary ?? "(none)"}\n\nOlder messages:\n${transcript}`,
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) return;

  const admin = createAdminClient();
  await admin
    .from("chat_conversations")
    .update({ memory_summary: text })
    .eq("id", params.conversationId);
}

export function selectRecentMessages<T>(messages: T[]): T[] {
  if (messages.length <= MEMORY_THRESHOLD) return messages;
  return messages.slice(-RECENT_KEEP);
}

export { getChatModel, getAnthropic, MEMORY_THRESHOLD, RECENT_KEEP };
