import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  logEpisodeEvent,
  resolveSeriesIdFromEpisode,
  type EpisodeEventType,
} from "@/lib/analytics/log-event";
import { resolvePaywallAb } from "@/lib/paywall-ab-server";

const CLIENT_EVENT_TYPES = new Set<EpisodeEventType>([
  "start",
  "complete",
  "paywall_hit",
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      eventType?: string;
      episodeId?: string;
      seriesId?: string;
    };

    const eventType = body.eventType as EpisodeEventType | undefined;
    if (!eventType || !CLIENT_EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    let seriesId = body.seriesId ?? null;
    let episodeId = body.episodeId ?? null;

    if (!seriesId && episodeId) {
      const resolved = await resolveSeriesIdFromEpisode(episodeId);
      seriesId = resolved?.seriesId ?? null;
      episodeId = resolved?.episodeId ?? episodeId;
    }

    if (!seriesId) {
      return NextResponse.json({ error: "Missing seriesId" }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ab = await resolvePaywallAb({ userId: user?.id ?? null });

    await logEpisodeEvent({
      userId: user?.id ?? null,
      seriesId,
      episodeId,
      eventType,
      paywallVariant: ab.variant,
      visitorId: ab.visitorId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[analytics] event ingest failed:", err);
    return NextResponse.json({ ok: true });
  }
}
