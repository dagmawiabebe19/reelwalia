import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      episodeId?: string;
      seriesId?: string;
      progressSeconds?: number;
      completed?: boolean;
    };

    const { episodeId, seriesId, progressSeconds = 0, completed = false } = body;

    if (!episodeId || !seriesId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { error } = await supabase.from("watch_history").upsert(
      {
        user_id: user.id,
        episode_id: episodeId,
        series_id: seriesId,
        progress_seconds: progressSeconds,
        completed,
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,episode_id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("watch progress error:", err);
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }
}
