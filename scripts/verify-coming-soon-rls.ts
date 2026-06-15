import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    throw new Error("Missing Supabase env vars in .env.local");
  }

  const anon = createClient(url, anonKey);
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { count: adminCount } = await admin
    .from("series")
    .select("id", { count: "exact", head: true })
    .eq("status", "coming_soon");

  const { data: anonRows, error: anonError } = await anon
    .from("series")
    .select("slug")
    .eq("status", "coming_soon");

  console.log(`Admin sees ${adminCount ?? 0} coming_soon series`);
  console.log(`Anon sees ${anonRows?.length ?? 0} coming_soon series`);

  if ((anonRows?.length ?? 0) < (adminCount ?? 0)) {
    const migrationPath = resolve(
      process.cwd(),
      "supabase/migrations/010_coming_soon_public_read.sql"
    );
    console.error(
      "\nRLS is blocking coming_soon rows for the homepage. Run this SQL in Supabase:\n"
    );
    console.error(readFileSync(migrationPath, "utf8"));
    process.exit(1);
  }

  if (anonError) {
    console.error(anonError.message);
    process.exit(1);
  }

  console.log("✓ Anon client can read all coming_soon series");
  console.log(anonRows?.map((r) => r.slug).join(", "));
}

void main();
