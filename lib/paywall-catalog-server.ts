import { createClient } from "@/lib/supabase/server";
import {
  mapPaywallCatalogPosters,
  type PaywallCatalogPoster,
} from "@/lib/paywall-catalog";

export async function listPaywallCatalogPosters(): Promise<PaywallCatalogPoster[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("series")
      .select("id, title, slug, poster_url, status")
      .eq("status", "published")
      .not("poster_url", "is", null);

    if (error || !data) return [];
    return mapPaywallCatalogPosters(data);
  } catch (err) {
    console.error("[paywall-catalog] list failed:", err);
    return [];
  }
}
