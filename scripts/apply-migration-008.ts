import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { COMING_SOON_SLUGS } from "../lib/coming-soon";
import { createAdminClient } from "../lib/supabase/admin";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const COMING_SOON_SERIES = [
  {
    title: "ECHOES OF ADDIS",
    slug: "echoes-of-addis",
    description:
      "An Ethiopian-American woman returns to Addis Ababa after twenty years to claim a family inheritance, only to discover the truth about her father was hidden for a reason.",
    genre: ["Drama"],
  },
  {
    title: "CROWN OF ASHES",
    slug: "crown-of-ashes",
    description:
      "When a successful attorney discovers her mother's death wasn't an accident, she risks her career to expose the family that destroyed her.",
    genre: ["Thriller", "Drama"],
  },
  {
    title: "MIDNIGHT CONTRACT",
    slug: "midnight-contract",
    description:
      "She signed away her freedom for one year of his protection. Now she's falling for the man who owns her contract — and the people he runs from want her gone.",
    genre: ["Romance", "Thriller"],
  },
  {
    title: "SHEBA RISING",
    slug: "sheba-rising",
    description:
      "Before she was queen, she was a refugee. The origin story of Sheba, told for the first time.",
    genre: ["Historical Drama"],
  },
  {
    title: "DESSIE NIGHTS",
    slug: "dessie-nights",
    description:
      "Two strangers from the diaspora meet in Dessie for one summer. Neither expects to leave changed.",
    genre: ["Romance"],
  },
  {
    title: "HARLEM CROWN",
    slug: "harlem-crown",
    description:
      "Three generations of a Harlem family confront the legacy of a secret that's tearing them apart.",
    genre: ["Drama"],
  },
] as const;

async function main() {
  const admin = createAdminClient();

  const { error: probeError } = await admin
    .from("series")
    .select("id")
    .eq("status", "coming_soon")
    .limit(1);

  if (probeError) {
    const migrationPath = resolve(
      process.cwd(),
      "supabase/migrations/008_series_status.sql"
    );
    console.error(
      "Migration 008 is not applied yet (coming_soon status unavailable)."
    );
    console.error(probeError.message);
    console.error(`\nRun this SQL in the Supabase SQL editor:\n`);
    console.error(readFileSync(migrationPath, "utf8"));
    process.exit(1);
  }

  for (const item of COMING_SOON_SERIES) {
    const { error } = await admin.from("series").upsert(
      {
        title: item.title,
        slug: item.slug,
        description: item.description,
        genre: [...item.genre],
        status: "coming_soon",
        total_episodes: 0,
        is_featured: false,
        view_count: 0,
      },
      { onConflict: "slug" }
    );

    if (error) {
      console.error(`Failed to upsert ${item.slug}:`, error.message);
      process.exit(1);
    }
    console.log(`✓ ${item.title}`);
  }

  const { error: redbirdError } = await admin
    .from("series")
    .update({ status: "published" })
    .or("slug.eq.redbird,title.ilike.redbird");

  if (redbirdError) {
    console.warn("REDBIRD publish check:", redbirdError.message);
  } else {
    console.log("✓ REDBIRD status confirmed published");
  }

  const { error: statusFixError } = await admin
    .from("series")
    .update({
      status: "coming_soon",
      is_featured: false,
      total_episodes: 0,
    })
    .in("slug", [...COMING_SOON_SLUGS]);

  if (statusFixError) {
    console.warn("Status fix for slate series:", statusFixError.message);
  } else {
    console.log("✓ Coming Soon slate status corrected");
  }

  console.log("\nComing Soon slate ready.");
}

void main();
