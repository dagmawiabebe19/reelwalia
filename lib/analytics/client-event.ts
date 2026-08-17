import type { EpisodeEventType } from "@/lib/analytics/log-event";

/** Fire-and-forget client ingest — never blocks playback. */
export function reportAnalyticsEvent(params: {
  eventType: Extract<EpisodeEventType, "start" | "complete" | "paywall_hit">;
  episodeId?: string;
  seriesId?: string;
}): void {
  try {
    void fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      keepalive: true,
    });
  } catch {
    // Non-blocking
  }
}
