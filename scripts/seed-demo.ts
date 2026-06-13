/**
 * Seed demo catalog for UI testing.
 * Run: npm run seed
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";

const DEMO_CDN = process.env.BUNNY_CDN_HOSTNAME ?? "demo-cdn.reelwalia.local";

const SERIES = [
  {
    title: "Crown of Ashes",
    slug: "crown-of-ashes",
    tagline: "Power has a price.",
    description:
      "A young heir returns to reclaim a throne built on betrayal — one episode at a time.",
    genre: ["Drama", "Romance"],
    is_featured: true,
    featured_order: 1,
  },
  {
    title: "Midnight Contract",
    slug: "midnight-contract",
    tagline: "One deal changes everything.",
    description:
      "She signed away more than she knew. The contract comes due at midnight.",
    genre: ["Thriller"],
    is_featured: true,
    featured_order: 2,
  },
  {
    title: "Echoes of Addis",
    slug: "echoes-of-addis",
    tagline: "Home is never far.",
    description:
      "Two sisters separated by oceans find their way back through secrets and song.",
    genre: ["Drama"],
    is_featured: true,
    featured_order: 3,
  },
];

function playbackUrl(videoId: string) {
  return `https://${DEMO_CDN}/${videoId}/playlist.m3u8`;
}

function thumbnailUrl(videoId: string) {
  return `https://${DEMO_CDN}/${videoId}/thumbnail.jpg`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const s of SERIES) {
    const { data: existing } = await admin
      .from("series")
      .select("id")
      .eq("slug", s.slug)
      .maybeSingle();

    let seriesId = existing?.id;

    if (seriesId) {
      console.log(`Updating series: ${s.title}`);
      await admin
        .from("series")
        .update({
          title: s.title,
          tagline: s.tagline,
          description: s.description,
          genre: s.genre,
          status: "published",
          total_episodes: 10,
          free_episode_count: 5,
          is_featured: s.is_featured,
          featured_order: s.featured_order,
          view_count: Math.floor(Math.random() * 50000) + 1000,
        })
        .eq("id", seriesId);
    } else {
      console.log(`Creating series: ${s.title}`);
      const { data: created, error } = await admin
        .from("series")
        .insert({
          ...s,
          status: "published",
          total_episodes: 10,
          free_episode_count: 5,
          view_count: Math.floor(Math.random() * 50000) + 1000,
        })
        .select("id")
        .single();

      if (error || !created) {
        console.error("Failed to create series:", error?.message);
        process.exit(1);
      }
      seriesId = created.id;
    }

    for (let i = 1; i <= 10; i++) {
      const videoId = `demo-${s.slug}-ep-${i}`;
      const title = `Episode ${i}`;

      const { data: epExisting } = await admin
        .from("episodes")
        .select("id")
        .eq("series_id", seriesId)
        .eq("episode_number", i)
        .maybeSingle();

      const payload = {
        series_id: seriesId,
        episode_number: i,
        title,
        bunny_video_id: videoId,
        video_url: playbackUrl(videoId),
        thumbnail_url: thumbnailUrl(videoId),
        duration_seconds: 90,
        is_free: i <= 5,
        view_count: Math.floor(Math.random() * 10000),
        published_at: new Date().toISOString(),
      };

      if (epExisting) {
        await admin.from("episodes").update(payload).eq("id", epExisting.id);
      } else {
        await admin.from("episodes").insert(payload);
      }
    }
  }

  console.log("Seed complete — 3 series × 10 episodes (placeholder Bunny URLs).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
