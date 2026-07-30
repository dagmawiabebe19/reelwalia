/**
 * Parse model reply into 1–4 short chat bubbles.
 * Expected format: a JSON array of strings. Falls back to a single clean bubble.
 */

function normalizeQuotes(raw: string): string {
  return raw
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
}

function stripCodeFence(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/** Remove stray JSON array artifacts from a plain-string fallback. */
export function scrubBubbleArtifacts(text: string): string {
  let s = text.trim();
  // Whole-string brackets
  if (s.startsWith("[") && s.endsWith("]")) {
    s = s.slice(1, -1).trim();
  }
  // Leading/trailing quotes on the whole string
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  // Common leftover from dumping an array as one string
  s = s.replace(/^\[\s*/, "").replace(/\s*\]$/, "");
  s = s.replace(/^"+|"+$/g, "").trim();
  return s || "…";
}

function bubblesFromParsedArray(parsed: unknown): string[] | null {
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const bubbles = parsed
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && "line" in item) {
        const line = (item as { line?: unknown }).line;
        return typeof line === "string" ? line.trim() : "";
      }
      if (item == null) return "";
      return String(item).trim();
    })
    .map(scrubBubbleArtifacts)
    .filter((s) => s && s !== "…")
    .slice(0, 4);
  return bubbles.length > 0 ? bubbles : null;
}

function tryParseJsonArray(raw: string): string[] | null {
  const candidates = [raw.trim()];

  const match = raw.match(/\[[\s\S]*\]/);
  if (match) candidates.push(match[0]);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      const bubbles = bubblesFromParsedArray(parsed);
      if (bubbles) return bubbles;
    } catch {
      // try next
    }
  }

  // Lenient: quoted strings inside brackets when JSON.parse fails
  const inner = raw.match(/^\s*\[([\s\S]*)\]\s*$/);
  if (inner) {
    const stringMatches = Array.from(inner[1].matchAll(/"((?:\\.|[^"\\])*)"/g));
    if (stringMatches.length > 0) {
      const bubbles = stringMatches
        .map((m) => scrubBubbleArtifacts(m[1].replace(/\\"/g, '"').replace(/\\n/g, "\n")))
        .filter(Boolean)
        .slice(0, 4);
      if (bubbles.length > 0) return bubbles;
    }
  }

  return null;
}

/**
 * Returns 1–4 bubble strings. Never returns a raw JSON array as a single bubble.
 */
export function parseBubbles(raw: string): string[] {
  let trimmed = normalizeQuotes(raw ?? "").trim();
  if (!trimmed) return ["…"];

  trimmed = stripCodeFence(trimmed);

  const fromJson = tryParseJsonArray(trimmed);
  if (fromJson) return fromJson;

  // Soft split on double newlines
  const parts = trimmed
    .split(/\n{2,}/)
    .map((p) => scrubBubbleArtifacts(p))
    .filter((p) => p && p !== "…")
    .slice(0, 4);

  if (parts.length > 0) return parts;

  return [scrubBubbleArtifacts(trimmed).slice(0, 400)];
}

/**
 * Expand a stored message that may itself be a JSON array string
 * (legacy bad rows) into separate display bubbles.
 */
export function expandStoredBubbleContent(content: string): string[] {
  const trimmed = normalizeQuotes(content ?? "").trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    const parsed = tryParseJsonArray(trimmed);
    if (parsed) return parsed;
  }
  return [scrubBubbleArtifacts(trimmed)];
}
