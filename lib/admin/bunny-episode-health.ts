import { bunnyVideoPlaybackIssue, getVideoStatus } from "@/lib/bunny";

type EpisodeBunnyRow = {
  id: string;
  bunny_video_id: string | null;
};

function isDemoBunnyId(id: string | null | undefined): boolean {
  return !id || id.startsWith("demo-");
}

/** Admin-only: surface Bunny upload/transcode problems per episode. */
export async function getEpisodeBunnyHealthFlags(
  episodes: EpisodeBunnyRow[]
): Promise<Record<string, string>> {
  const flags: Record<string, string> = {};

  for (const ep of episodes) {
    if (isDemoBunnyId(ep.bunny_video_id)) continue;

    try {
      const status = await getVideoStatus(ep.bunny_video_id!);
      const issue = bunnyVideoPlaybackIssue(status);
      if (issue) flags[ep.id] = issue;
    } catch (err) {
      console.warn("Bunny health check failed for episode", ep.id, err);
      flags[ep.id] = "Could not verify Bunny video — check the GUID in the dashboard.";
    }
  }

  return flags;
}
