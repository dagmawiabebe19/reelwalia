import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/admin";
import { syncEpisodeBunnyMetadata } from "@/lib/admin/sync-episode-bunny-metadata";
import {
  bunnyVideoHasSource,
  getPlaybackUrl,
  getThumbnailUrl,
  getVideoStatus,
  isVideoReady,
} from "@/lib/bunny";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveFreeEpisodeCount } from "@/lib/access";

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as {
      seriesId?: string;
      videoId?: string;
      title?: string;
      episodeNumber?: number;
      subtitleUrl?: string;
    };

    const { seriesId, videoId, title, episodeNumber, subtitleUrl } = body;

    if (!seriesId || !videoId || !title?.trim() || !episodeNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const status = await getVideoStatus(videoId);
    if (!bunnyVideoHasSource(status)) {
      return NextResponse.json(
        {
          error:
            "Bunny has no video file for this upload (0 bytes stored). The PUT upload may have failed — try again.",
        },
        { status: 400 }
      );
    }
    if (!isVideoReady(status.status) && status.status !== 1 && status.status !== 2 && status.status !== 3) {
      // Allow save after upload even if still transcoding — URL will work when ready
    }

    const admin = createAdminClient();

    const { data: series } = await admin
      .from("series")
      .select("free_episode_count, slug")
      .eq("id", seriesId)
      .single();

    if (!series) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }

    const videoUrl = getPlaybackUrl(videoId);
    const thumbnailUrl = getThumbnailUrl(videoId);
    const isFree = episodeNumber <= resolveFreeEpisodeCount(series.free_episode_count);

    const { data: episode, error } = await admin
      .from("episodes")
      .insert({
        series_id: seriesId,
        episode_number: episodeNumber,
        title: title.trim(),
        bunny_video_id: videoId,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        subtitle_url: subtitleUrl ?? null,
        duration_seconds: status.length > 0 ? Math.round(status.length) : null,
        is_free: isFree,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin
      .from("series")
      .update({ total_episodes: episodeNumber })
      .eq("id", seriesId)
      .lt("total_episodes", episodeNumber);

    if (episode) {
      await syncEpisodeBunnyMetadata(admin, [episode]);
    }

    if (series?.slug) {
      revalidatePath("/");
      revalidatePath(`/series/${series.slug}`);
      revalidatePath(`/admin/series/${seriesId}`);
    }

    return NextResponse.json({ episode, transcodeStatus: status.status });
  } catch (err) {
    console.error("finalize error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Finalize failed" },
      { status: 500 }
    );
  }
}
