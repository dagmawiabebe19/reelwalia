"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CharacterAvatar } from "@/components/chat/CharacterAvatar";
import { expandStoredBubbleContent, parseBubbles } from "@/lib/chat/bubbles";

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
    <div className="flex items-center gap-1.5 px-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-200/80 [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-200/80 [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-200/80 [animation-delay:300ms]" />
    </div>
  );
}

function normalizeIncomingBubbles(content: string): string[] {
  const expanded = expandStoredBubbleContent(content);
  if (expanded.length > 1) return expanded;
  if (content.trim().startsWith("[")) {
    return parseBubbles(content);
  }
  return expanded.length ? expanded : parseBubbles(content);
}

function expandInitialMessages(messages: ChatBubble[]): ChatBubble[] {
  const out: ChatBubble[] = [];
  for (const msg of messages) {
    if (msg.role !== "character") {
      out.push(msg);
      continue;
    }
    const parts = normalizeIncomingBubbles(msg.content);
    parts.forEach((content, i) => {
      out.push({
        ...msg,
        id: `${msg.id}-${i}`,
        content,
      });
    });
  }
  return out;
}

export function ChatScreen({
  character,
  seriesTitle,
  seriesPosterUrl,
  backHref,
  initialMessages,
  currentEpisodeNumber,
}: {
  character: {
    id: string;
    name: string;
    avatar_url: string | null;
    short_bio?: string | null;
  };
  seriesTitle: string;
  seriesPosterUrl: string | null;
  backHref: string;
  initialMessages: ChatBubble[];
  currentEpisodeNumber: number | null;
}) {
  const [messages, setMessages] = useState<ChatBubble[]>(() =>
    expandInitialMessages(initialMessages)
  );
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // Keep the thread scrolled to the latest message without scrolling the document
  // (scrollIntoView on iOS can bounce the whole page / composer).
  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  }, [messages, typing]);

  // Lock page scroll + pin shell to the visual viewport (keyboard-safe on iOS).
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    const shell = shellRef.current;
    const vv = window.visualViewport;

    const syncViewport = () => {
      if (!shell) return;
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      if (desktop || !vv) {
        shell.style.height = "";
        shell.style.top = "";
        return;
      }
      // Sit inside the visual viewport so the composer stays just above the keyboard
      shell.style.height = `${Math.round(vv.height)}px`;
      shell.style.top = `${Math.round(vv.offsetTop)}px`;
    };

    syncViewport();
    vv?.addEventListener("resize", syncViewport);
    vv?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevBodyOverscroll;
      vv?.removeEventListener("resize", syncViewport);
      vv?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  const emptyHint = useMemo(
    () => `Say hi to ${character.name}. They only know up to what you've watched.`,
    [character.name]
  );

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
      let bubbleCount = 0;

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
            const pieces = normalizeIncomingBubbles(payload.content);

            for (let i = 0; i < pieces.length; i++) {
              if (bubbleCount > 0 || i > 0) {
                setTyping(true);
                await new Promise((r) => setTimeout(r, 420));
              }
              setTyping(false);
              setMessages((prev) => [
                ...prev,
                {
                  id: `local-char-${Date.now()}-${payload.index}-${i}`,
                  role: "character",
                  content: pieces[i],
                  createdAt: new Date().toISOString(),
                },
              ]);
              bubbleCount += 1;
              if (i < pieces.length - 1) {
                setTyping(true);
              }
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
      const message = err instanceof Error ? err.message : "Chat failed";
      setError(message);
      setTyping(false);
      // Drop optimistic user bubble — server did not accept the turn
      setMessages((prev) => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        if (last.role === "user" && last.id.startsWith("local-user-")) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      // Restore draft so they can retry without retyping
      setDraft((current) => (current.trim() ? current : text));
    } finally {
      setSending(false);
      setTyping(false);
      inputRef.current?.focus();
    }
  };

  const messageList = (
    <>
      {messages.length === 0 && (
        <p className="mb-4 text-center text-sm text-zinc-400">{emptyHint}</p>
      )}

      <ul className="space-y-2.5">
        {messages.map((msg) => {
          const mine = msg.role === "user";
          return (
            <li
              key={msg.id}
              className={`flex ${mine ? "justify-end" : "justify-start"} animate-[chatBubbleIn_0.28s_ease-out]`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-lg ${
                  mine
                    ? "rounded-br-md bg-obsidian-red text-white shadow-obsidian-red/20"
                    : "rounded-bl-md border border-amber-500/15 bg-gradient-to-br from-zinc-700/90 to-zinc-800/95 text-amber-50/95"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <div
                  className={`mt-1 flex items-center gap-1 text-[10px] ${
                    mine ? "justify-end text-white/70" : "text-amber-100/40"
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
        <div className="mt-2 flex justify-start animate-[chatBubbleIn_0.2s_ease-out]">
          <div className="rounded-2xl rounded-bl-md border border-amber-500/15 bg-zinc-800/90 px-3.5 py-2.5">
            <TypingDots />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </>
  );

  const composer = (
    <form
      onSubmit={send}
      className="relative z-20 shrink-0 border-t border-white/[0.08] bg-black/90 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:pb-3"
    >
      <div className="mx-auto flex w-full max-w-lg items-end gap-2 px-3 lg:max-w-2xl lg:px-5">
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
          // text-base (16px) prevents iOS Safari zoom-on-focus; keep 16px on lg too
          className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-white/[0.12] bg-zinc-900/90 px-4 py-2.5 text-base leading-snug text-white placeholder:text-zinc-500 focus:border-obsidian-red/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="mb-1 inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full bg-obsidian-red px-3 text-sm font-semibold text-white shadow-lg shadow-obsidian-red/30 transition hover:bg-obsidian-red-hover disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </form>
  );

  return (
    <div
      ref={shellRef}
      className="fixed inset-x-0 top-0 z-40 flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden overscroll-none bg-black text-white lg:inset-0 lg:flex-row"
    >
      {/* Chat column — full width on mobile; ~60% on desktop (LEFT on lg+) */}
      <div className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile-only soft wash + cinematic header (unchanged behavior) */}
        {seriesPosterUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={seriesPosterUrl}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.18] blur-2xl lg:hidden"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/90 to-black lg:hidden" />
        <div className="pointer-events-none absolute inset-0 hidden bg-zinc-950 lg:block" />

        <header className="relative z-20 shrink-0 overflow-hidden border-b border-white/[0.08] pt-[env(safe-area-inset-top)] lg:hidden">
          {seriesPosterUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={seriesPosterUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover opacity-40 blur-[2px]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/75 to-black" />

          <div className="relative mx-auto flex max-w-lg flex-col items-center px-3 pb-5 pt-3">
            <div className="mb-3 flex w-full items-center">
              <Link
                href={backHref}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/40 text-zinc-200 backdrop-blur-sm transition hover:bg-black/60 hover:text-white"
                aria-label="Back"
              >
                ←
              </Link>
            </div>

            <CharacterAvatar
              name={character.name}
              avatarUrl={character.avatar_url}
              sizeClass="h-24 w-24"
              textClass="text-3xl"
              online
            />
            <p className="mt-3 font-display text-xl uppercase tracking-wide text-white drop-shadow">
              {character.name}
            </p>
            <p className="mt-0.5 text-xs text-amber-100/70">
              {seriesTitle} · <span className="text-emerald-400">online</span>
            </p>
          </div>
        </header>

        {/* Desktop chat top bar */}
        <div className="relative z-20 hidden shrink-0 items-center gap-3 border-b border-white/[0.08] bg-black/80 px-5 py-3 backdrop-blur-md lg:flex">
          <CharacterAvatar
            name={character.name}
            avatarUrl={character.avatar_url}
            sizeClass="h-11 w-11"
            textClass="text-base"
            online
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm uppercase tracking-wide text-white">
              {character.name}
            </p>
            <p className="truncate text-[11px] text-zinc-500">
              {seriesTitle} · <span className="text-emerald-400">online</span>
            </p>
          </div>
        </div>

        <div
          ref={threadRef}
          className="relative z-10 mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-4 [-webkit-overflow-scrolling:touch] lg:max-w-2xl lg:px-5"
        >
          {messageList}
        </div>

        {error && (
          <p
            role="status"
            className="relative z-10 mx-auto w-full max-w-lg shrink-0 px-3 pb-2 text-center text-xs leading-relaxed text-amber-200/90 lg:max-w-2xl"
          >
            {error}
          </p>
        )}

        {composer}
      </div>

      {/* Desktop poster hero — sticky, full-height, ~40% (RIGHT on lg+) */}
      <aside className="relative hidden h-full w-[40%] min-w-[320px] max-w-[520px] shrink-0 overflow-hidden lg:flex lg:flex-col">
        {seriesPosterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={seriesPosterUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-black to-obsidian-red/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/30" />

        <div className="relative z-10 flex h-full flex-col justify-between p-8 xl:p-10">
          <Link
            href={backHref}
            className="inline-flex w-fit min-h-11 items-center gap-2 rounded-full bg-black/45 px-4 text-sm text-zinc-200 backdrop-blur-sm transition hover:bg-black/65 hover:text-white"
          >
            ← Back
          </Link>

          <div className="max-w-md space-y-4 pb-4">
            <CharacterAvatar
              name={character.name}
              avatarUrl={character.avatar_url}
              sizeClass="h-24 w-24"
              textClass="text-3xl"
              online
            />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-obsidian-red">
                {seriesTitle}
              </p>
              <h1 className="mt-2 font-display text-4xl uppercase leading-none tracking-wide text-white drop-shadow-lg xl:text-5xl">
                {character.name}
              </h1>
              <p className="mt-2 text-sm text-emerald-400">Online now</p>
            </div>
            {character.short_bio && (
              <p className="text-sm leading-relaxed text-zinc-200/90 drop-shadow">
                {character.short_bio}
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
