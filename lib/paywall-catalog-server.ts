import { createClient } from "@/lib/supabase/server";
import {
  PAYWALL_CATALOG_LIMIT,
  mapPaywallCatalogPosters,
  type PaywallCatalogPoster,
} from "@/lib/paywall-catalog";

export async function listPaywallCatalogPosters(): Promise<PaywallCatalogPoster[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("series")
      .select("id, title, poster_url, status, is_featured, featured_order, view_count")
      .eq("status", "published")
      .not("poster_url", "is", null)
      .limit(24);

    if (error || !data) return [];
    return mapPaywallCatalogPosters(data).slice(0, PAYWALL_CATALOG_LIMIT);
  } catch (err) {
    console.error("[paywall-catalog] list failed:", err);
    return [];
  }
}
