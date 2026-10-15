import "server-only";

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { COMMERCIAL_PUBLIC_COLUMNS, type Commercial } from "@/lib/commercials/constants";

export const COMMERCIALS_CACHE_TAG = "commercials";

/** Published commercials, read with the anon key so RLS (is_published = true) applies. */
async function fetchPublishedCommercials(): Promise<Commercial[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("commercials")
    .select(COMMERCIAL_PUBLIC_COLUMNS)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    // Table missing before migration 035 is applied — render the empty state.
    console.error("[commercials] fetch failed:", error.message);
    return [];
  }
  return (data ?? []) as Commercial[];
}

/** Cached for 60s; admin writes call revalidateTag(COMMERCIALS_CACHE_TAG) for instant updates. */
export const getPublishedCommercials = unstable_cache(fetchPublishedCommercials, ["published-commercials"], {
  revalidate: 60,
  tags: [COMMERCIALS_CACHE_TAG],
});
