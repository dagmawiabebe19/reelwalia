/**
 * Parse model reply into 1–4 short chat bubbles.
 * Expected format: a JSON array of strings. Falls back to splitting / wrapping.
 */
export function parseBubbles(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return ["…"];

  // Prefer a JSON array anywhere in the response
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]) as unknown;
      if (Array.isArray(parsed)) {
        const bubbles = parsed
          .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
          .filter(Boolean)
          .slice(0, 4);
        if (bubbles.length > 0) return bubbles;
      }
    } catch {
      // fall through
    }
  }

  // Strip markdown code fences if present
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (unfenced !== trimmed) {
    return parseBubbles(unfenced);
  }

  // Soft split on double newlines into up to 4 bubbles
  const parts = trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 4);
  return parts.length > 0 ? parts : [trimmed.slice(0, 400)];
}
