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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminApi();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      display_view_count?: number | null;
    };

    const updates: { title?: string; display_view_count?: number | null } = {};

    if (body.title !== undefined) {
      if (!body.title.trim()) {
        return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
      }
      updates.title = body.title.trim();
    }

    if (body.display_view_count !== undefined) {
      if (
        body.display_view_count !== null &&
        (!Number.isInteger(body.display_view_count) || body.display_view_count < 0)
      ) {
        return NextResponse.json(
          { error: "display_view_count must be a non-negative integer or null" },
          { status: 400 }
        );
      }
      updates.display_view_count = body.display_view_count;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("episodes")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ episode: data });
  } catch (err) {
    console.error("episode patch error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminApi();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const admin = createAdminClient();

    const { data: episode } = await admin
      .from("episodes")
      .select("id, bunny_video_id, series_id, episode_number")
      .eq("id", params.id)
      .maybeSingle();

    if (!episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    await safeDeleteBunnyVideo(episode.bunny_video_id);

    const { error } = await admin.from("episodes").delete().eq("id", params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { count } = await admin
      .from("episodes")
      .select("id", { count: "exact", head: true })
      .eq("series_id", episode.series_id);

    await admin
      .from("series")
      .update({ total_episodes: count ?? 0 })
      .eq("id", episode.series_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("episode delete error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
