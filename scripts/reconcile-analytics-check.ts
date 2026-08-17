/**
 * One-off: count watch_history completions missing from episode_events for a series.
 * Run: npx tsx scripts/reconcile-analytics-check.ts [series-slug]
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { countHistoryCompletionsRecovered } from "../lib/admin/analytics-dropoff";

async function main() {
  const slug = process.argv[2] ?? "wedded-to-the-enemy";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data: series } = await admin.from("series").select("id, title").eq("slug", slug).maybeSingle();
  if (!series) {
    console.error(`Series not found: ${slug}`);
    process.exit(1);
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: history } = await admin
    .from("watch_history")
    .select("user_id, episode_id, completed, last_watched_at")
    .eq("series_id", series.id)
    .gte("last_watched_at", thirtyDaysAgo);

  let events: { user_id: string | null; episode_id: string | null; event_type: string }[] = [];
  const eventsRes = await admin
    .from("episode_events")
    .select("user_id, episode_id, event_type, created_at")
    .eq("series_id", series.id)
    .gte("created_at", thirtyDaysAgo);

  if (!eventsRes.error) {
    events = eventsRes.data ?? [];
  } else {
    console.warn("episode_events query:", eventsRes.error.message);
  }

  const recovered = countHistoryCompletionsRecovered({
    history: history ?? [],
    completeEvents: events,
  });

  const histCompleted = (history ?? []).filter((h) => h.completed).length;
  const eventCompletes = events.filter((e) => e.event_type === "complete").length;
  const eventStarts = events.filter((e) => e.event_type === "start").length;

  console.log(JSON.stringify({
    series: series.title,
    slug,
    range: "last 30 days",
    watch_history_completed_rows: histCompleted,
    episode_events_complete: eventCompletes,
    episode_events_start: eventStarts,
    recovered_from_watch_history: recovered,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
