import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { deleteVideo } from "@/lib/bunny";
import { createAdminClient } from "@/lib/supabase/admin";

function isDemoBunnyId(id: string | null | undefined): boolean {
  return !id || id.startsWith("demo-");
}

async function safeDeleteBunnyVideo(videoId: string | null | undefined) {
  if (isDemoBunnyId(videoId)) return;
  try {
    await deleteVideo(videoId!);
  } catch (err) {
    console.warn("Bunny delete skipped/failed:", videoId, err);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as { seriesId?: string };
    const { seriesId } = body;

    if (!seriesId) {
      return NextResponse.json({ error: "seriesId required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: episodes } = await admin
      .from("episodes")
      .select("id, bunny_video_id")
      .eq("series_id", seriesId);

    for (const ep of episodes ?? []) {
      await safeDeleteBunnyVideo(ep.bunny_video_id);
    }

    const { error } = await admin.from("episodes").delete().eq("series_id", seriesId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from("series").update({ total_episodes: 0 }).eq("id", seriesId);

    return NextResponse.json({ ok: true, deleted: episodes?.length ?? 0 });
  } catch (err) {
    console.error("clear episodes error:", err);
    return NextResponse.json({ error: "Clear failed" }, { status: 500 });
  }
}
