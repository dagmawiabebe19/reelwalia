"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

export type ChatBubble = {
  id: string;
  role: "user" | "character";
  content: string;
  createdAt?: string;
};

function formatTime(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
    </div>
  );
}

export function ChatScreen({
  character,
  seriesTitle,
  backHref,
  initialMessages,
  currentEpisodeNumber,
}: {
  character: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  seriesTitle: string;
  backHref: string;
  initialMessages: ChatBubble[];
  currentEpisodeNumber: number | null;
}) {
  const [messages, setMessages] = useState<ChatBubble[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setError(null);
    setDraft("");
    setSending(true);

    const userBubble: ChatBubble = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userBubble]);
    setTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          message: text,
          currentEpisodeNumber: currentEpisodeNumber ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to send");
      }

      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          let event = "message";
          let dataLine = "";
          for (const line of lines) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            if (line.startsWith("data:")) dataLine += line.slice(5).trim();
          }
          if (!dataLine) continue;

          if (event === "bubble") {
            const payload = JSON.parse(dataLine) as { index: number; content: string };
            setTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `local-char-${Date.now()}-${payload.index}`,
                role: "character",
                content: payload.content,
                createdAt: new Date().toISOString(),
              },
            ]);
            if (payload.index >= 0) {
              setTyping(true);
              await new Promise((r) => setTimeout(r, 280));
              setTyping(false);
            }
          }

          if (event === "done") {
            setTyping(false);
          }

          if (event === "error") {
            const payload = JSON.parse(dataLine) as { error?: string };
            throw new Error(payload.error ?? "Chat error");
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
      setTyping(false);
    } finally {
      setSending(false);
      setTyping(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-black text-white">
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-black/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-3 py-3">
          <Link
            href={backHref}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.06] hover:text-white"
            aria-label="Back"
          >
            ←
          </Link>
          <div className="relative h-10 w-10 shrink-0">
            <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-zinc-900">
              {character.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={character.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-display text-obsidian-red">
                  {character.name.charAt(0)}
                </div>
              )}
            </div>
            <span
              className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-black bg-emerald-400"
              aria-label="Online"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm uppercase tracking-wide">
              {character.name}
            </p>
            <p className="truncate text-[11px] text-zinc-500">
              {seriesTitle} · online
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-y-auto px-3 py-4">
        {messages.length === 0 && (
          <p className="mb-4 text-center text-sm text-zinc-500">
            Say hi to {character.name}. They only know up to what you&apos;ve watched.
          </p>
        )}

        <ul className="space-y-2">
          {messages.map((msg) => {
            const mine = msg.role === "user";
            return (
              <li
                key={msg.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    mine
                      ? "rounded-br-md bg-obsidian-red text-white"
                      : "rounded-bl-md bg-zinc-800 text-zinc-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <div
                    className={`mt-1 flex items-center gap-1 text-[10px] ${
                      mine ? "justify-end text-white/70" : "text-zinc-500"
                    }`}
                  >
                    <span>{formatTime(msg.createdAt)}</span>
                    {mine && <span aria-hidden="true">✓✓</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {typing && (
          <div className="mt-2 flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-zinc-800 px-3 py-2">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mx-auto w-full max-w-lg px-3 pb-2 text-center text-xs text-red-400">
          {error}
        </p>
      )}

      <form
        onSubmit={send}
        className="border-t border-white/[0.08] bg-black/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-lg items-end gap-2 px-3">
          {/* Phase 2 placeholders — not wired */}
          <button
            type="button"
            disabled
            title="Coming soon"
            aria-label="Voice message (coming soon)"
            className="mb-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-600 opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zm-5 9a1 1 0 01-1-1v-2h2v2a1 1 0 01-1 1z" />
            </svg>
          </button>
          <button
            type="button"
            disabled
            title="Coming soon"
            aria-label="Photo (coming soon)"
            className="mb-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-600 opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path d="M4 5a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2H4zm3 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-1 9l3.5-4.5 2.5 3 3.5-4.5L19 17H6z" />
            </svg>
          </button>

          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder={`Message ${character.name}…`}
            disabled={sending}
            className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-white/[0.12] bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-obsidian-red/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="mb-1 inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full bg-obsidian-red px-3 text-sm font-semibold text-white transition hover:bg-obsidian-red-hover disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
