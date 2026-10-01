import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEpisodeFree, resolveViewerFreeEpisodeCount } from "@/lib/access";
import { hasActiveAccess } from "@/lib/payments/access";
import { verifyCheckoutSession } from "@/lib/stripe/server";
import { signStreamUrl } from "@/lib/video/stream-urls";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

/**
 * Fresh, short-lived signed playback URL for one episode.
 * Free episodes (1–4) for everyone; Episode 5+ only with active access
 * (or a just-completed Stripe guest checkout via ?session_id=).
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
  }

  const admin = createAdminClient();
  const { data: episode } = await admin
    .from("episodes")
    .select("id, episode_number, video_url, duration_seconds, series:series_id(status)")
    .eq("id", params.id)
    .maybeSingle();

  const series = (episode?.series ?? null) as { status?: string } | { status?: string }[] | null;
  const seriesStatus = Array.isArray(series) ? series[0]?.status : series?.status;
  if (!episode || seriesStatus !== "published" || !episode.video_url) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
  }

  let allowed = isEpisodeFree(episode.episode_number, resolveViewerFreeEpisodeCount());

  if (!allowed) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    allowed = await hasActiveAccess(user?.id ?? null);
  }

  if (!allowed) {
    const sessionId = new URL(request.url).searchParams.get("session_id");
    if (sessionId) {
      const verified = await verifyCheckoutSession(sessionId);
      allowed = verified?.active === true;
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: "Subscription required" }, { status: 403, headers: NO_STORE });
  }

  const signed = signStreamUrl(episode.video_url, { durationSeconds: episode.duration_seconds });
  return NextResponse.json(
    { url: signed.url, expiresAt: signed.expiresAt },
    { headers: NO_STORE }
  );
}
