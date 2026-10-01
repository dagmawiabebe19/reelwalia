/** Browser helper: ask the server for a freshly signed playback URL. Null when not allowed / failed. */
export async function fetchFreshStreamUrl(episodeId: string): Promise<string | null> {
  try {
    const qs = new URLSearchParams();
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (sessionId) qs.set("session_id", sessionId);
    const query = qs.toString();
    const res = await fetch(
      `/api/episodes/${encodeURIComponent(episodeId)}/stream${query ? `?${query}` : ""}`,
      { cache: "no-store", credentials: "same-origin" }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { url?: string };
    return typeof json.url === "string" && json.url ? json.url : null;
  } catch {
    return null;
  }
}
