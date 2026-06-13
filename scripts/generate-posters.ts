/**
 * Generate series posters via DALL-E 3 and upload to Supabase Storage.
 * Run: npm run generate-posters
 *
 * Requires OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { config } from "dotenv";

config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import sharp from "sharp";

const DELAY_MS = 2000;

interface SeriesRow {
  id: string;
  title: string;
  slug: string;
  genre: string[];
  poster_url: string | null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function genreSceneAddition(genres: string[]): string {
  const primary = genres[0]?.toLowerCase() ?? "drama";

  if (genres.some((g) => /romance|drama/i.test(g)) && !genres.some((g) => /thriller|werewolf|revenge/i.test(g))) {
    return "two characters in elegant attire, intense gaze, palace or mansion setting";
  }
  if (genres.some((g) => /thriller/i.test(g))) {
    return "shadowy figure, neon city lights, contract document or weapon, tension";
  }
  if (genres.some((g) => /werewolf/i.test(g))) {
    return "moonlit forest, glowing eyes, supernatural atmosphere";
  }
  if (genres.some((g) => /revenge/i.test(g))) {
    return "single character with steely expression, broken glass, fire";
  }

  switch (primary) {
    case "romance":
    case "drama":
      return "two characters in elegant attire, intense gaze, palace or mansion setting";
    case "thriller":
      return "shadowy figure, neon city lights, contract document or weapon, tension";
    case "werewolf":
      return "moonlit forest, glowing eyes, supernatural atmosphere";
    case "revenge":
      return "single character with steely expression, broken glass, fire";
    default:
      return "two characters in elegant attire, intense gaze, palace or mansion setting";
  }
}

function buildPrompt(series: SeriesRow): string {
  const genreLabel = series.genre.length ? series.genre.join(" / ") : "Drama";
  const scene = genreSceneAddition(series.genre);

  return [
    "Cinematic vertical movie poster, dramatic film noir lighting,",
    `title '${series.title}' in bold cinematic display typography at the bottom third,`,
    `${genreLabel} genre, beautiful diverse African and Ethiopian-American characters,`,
    "luxurious composition, professional movie poster art,",
    "volumetric lighting, high detail, 9:16 aspect ratio",
    scene,
  ].join(" ");
}

function needsPoster(posterUrl: string | null): boolean {
  if (!posterUrl) return true;
  return posterUrl.toLowerCase().includes("placeholder");
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download image: ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!openaiKey) {
    console.error("Missing OPENAI_API_KEY in .env.local");
    process.exit(1);
  }
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const openai = new OpenAI({ apiKey: openaiKey });

  const { data: allSeries, error: fetchError } = await admin
    .from("series")
    .select("id, title, slug, genre, poster_url")
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("Failed to fetch series:", fetchError.message);
    process.exit(1);
  }

  const targets = (allSeries ?? []).filter((s) => needsPoster(s.poster_url));

  if (!targets.length) {
    console.log("No series need poster generation.");
    return;
  }

  console.log(`Generating posters for ${targets.length} series…`);

  for (let i = 0; i < targets.length; i++) {
    const series = targets[i] as SeriesRow;
    console.log(`\n[${i + 1}/${targets.length}] ${series.title} (${series.slug})`);

    try {
      const prompt = buildPrompt(series);
      console.log("  → Calling DALL-E 3…");

      const image = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1792",
        quality: "standard",
      });

      const imageUrl = image.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error("No image URL returned from OpenAI");
      }

      console.log("  → Downloading image…");
      const raw = await downloadImage(imageUrl);

      console.log("  → Resizing to 720×1280…");
      const jpg = await sharp(raw)
        .resize(720, 1280, { fit: "cover", position: "centre" })
        .jpeg({ quality: 85 })
        .toBuffer();

      const storagePath = `${series.slug}.jpg`;
      console.log(`  → Uploading to posters/${storagePath}…`);

      const { error: uploadError } = await admin.storage
        .from("posters")
        .upload(storagePath, jpg, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      const { data: publicUrl } = admin.storage.from("posters").getPublicUrl(storagePath);

      const { error: updateError } = await admin
        .from("series")
        .update({ poster_url: publicUrl.publicUrl })
        .eq("id", series.id);

      if (updateError) {
        throw new Error(`DB update failed: ${updateError.message}`);
      }

      console.log(`  ✓ Done: ${publicUrl.publicUrl}`);
    } catch (err) {
      console.error(
        `  ✗ Failed:`,
        err instanceof Error ? err.message : err
      );
    }

    if (i < targets.length - 1) {
      console.log(`  … waiting ${DELAY_MS / 1000}s (rate limit)…`);
      await sleep(DELAY_MS);
    }
  }

  console.log("\nPoster generation complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
