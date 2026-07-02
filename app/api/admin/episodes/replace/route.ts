import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/admin";
import { syncEpisodeBunnyMetadata } from "@/lib/admin/sync-episode-bunny-metadata";
import {
  deleteVideo,
  getPlaybackUrl,
  getThumbnailUrl,
  waitForBunnyVideoSource,
} from "@/lib/bunny";
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
    const body = (await request.json()) as {
      episodeId?: string;
      videoId?: string;
    };

    const { episodeId, videoId } = body;

    if (!episodeId || !videoId) {
      return NextResponse.json({ error: "Missing episodeId or videoId" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: episode } = await admin
      .from("episodes")
      .select("id, bunny_video_id, episode_number, series_id")
      .eq("id", episodeId)
      .maybeSingle();

    if (!episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    const status = await waitForBunnyVideoSource(videoId);
    const oldBunnyId = episode.bunny_video_id;

    const { data: updated, error } = await admin
      .from("episodes")
      .update({
        bunny_video_id: videoId,
        video_url: getPlaybackUrl(videoId),
        thumbnail_url: getThumbnailUrl(videoId),
        duration_seconds: status.length > 0 ? Math.round(status.length) : null,
      })
      .eq("id", episodeId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (oldBunnyId && oldBunnyId !== videoId) {
      await safeDeleteBunnyVideo(oldBunnyId);
    }

    if (updated) {
      await syncEpisodeBunnyMetadata(admin, [updated]);
    }

    const { data: series } = await admin
      .from("series")
      .select("slug")
      .eq("id", episode.series_id)
      .maybeSingle();

    if (series?.slug) {
      revalidatePath("/");
      revalidatePath(`/series/${series.slug}`);
      revalidatePath(`/admin/series/${episode.series_id}`);
    }

    return NextResponse.json({ episode: updated, transcodeStatus: status.status });
  } catch (err) {
    console.error("replace error:", err);
    const message = err instanceof Error ? err.message : "Replace failed";
    const status = message.includes("0 bytes") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
