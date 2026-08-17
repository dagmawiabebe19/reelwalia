import { createAdminClient } from "@/lib/supabase/admin";
import {
  TRAFFIC_SOURCE_UNKNOWN,
  isAttributableTrafficSource,
  isNewAccountForTrafficSource,
  type TrafficSource,
  type TrafficSourceCookie,
} from "@/lib/traffic-source";

function isMissingRelation(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

export async function persistTrafficAssignment(params: {
  visitorId: string;
  source: TrafficSource;
  userId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
}): Promise<void> {
  if (!isAttributableTrafficSource(params.source)) return;

  try {
    const admin = createAdminClient();
    const { data: existing, error: readError } = await admin
      .from("traffic_assignments")
      .select("id, source, user_id")
      .eq("visitor_id", params.visitorId)
      .maybeSingle();

    if (isMissingRelation(readError)) return;
    if (readError && !existing) {
      console.error("[traffic-source] assignment read failed:", readError.message);
      return;
    }

    if (!existing) {
      const { error: insertError } = await admin.from("traffic_assignments").insert({
        visitor_id: params.visitorId,
        source: params.source,
        user_id: params.userId ?? null,
        utm_source: params.utmSource ?? null,
        utm_medium: params.utmMedium ?? null,
        utm_campaign: params.utmCampaign ?? null,
        referrer: params.referrer ?? null,
      });
      if (insertError && !isMissingRelation(insertError) && insertError.code !== "23505") {
        console.error("[traffic-source] assignment insert failed:", insertError.message);
      }
      return;
    }

    if (params.userId && !existing.user_id && existing.source === params.source) {
      const { error: updateError } = await admin
        .from("traffic_assignments")
        .update({ user_id: params.userId })
        .eq("id", existing.id)
        .is("user_id", null);
      if (updateError && !isMissingRelation(updateError)) {
        console.error("[traffic-source] assignment attach user failed:", updateError.message);
      }
    }
  } catch (err) {
    console.error("[traffic-source] assignment persist threw:", err);
  }
}

export async function readProfileTrafficSource(
  userId: string
): Promise<{ source: TrafficSource | null; createdAt: string | null }> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("traffic_source, created_at")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) {
      return { source: null, createdAt: null };
    }
    const source = data.traffic_source as TrafficSource | null;
    return {
      source:
        source === "ad" || source === "organic" || source === "unknown" ? source : null,
      createdAt: data.created_at ?? null,
    };
  } catch {
    return { source: null, createdAt: null };
  }
}

export async function writeProfileTrafficSource(
  userId: string,
  source: TrafficSource
): Promise<void> {
  if (!isAttributableTrafficSource(source)) return;

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ traffic_source: source })
      .eq("id", userId)
      .is("traffic_source", null);
    if (error && !isMissingRelation(error)) {
      console.error("[traffic-source] profile write failed:", error.message);
    }
  } catch (err) {
    console.error("[traffic-source] profile write threw:", err);
  }
}

export async function resolveTrafficSourceForUserId(
  userId: string | null | undefined
): Promise<TrafficSource | null> {
  if (!userId) return null;
  const { source } = await readProfileTrafficSource(userId);
  if (source && source !== TRAFFIC_SOURCE_UNKNOWN) return source;
  return source;
}

export async function adoptTrafficCookieOntoNewAccount(params: {
  userId: string;
  cookie: TrafficSourceCookie | null;
}): Promise<TrafficSource | null> {
  const profile = await readProfileTrafficSource(params.userId);
  if (profile.source && profile.source !== TRAFFIC_SOURCE_UNKNOWN) {
    return profile.source;
  }

  if (!params.cookie || !isNewAccountForTrafficSource(profile.createdAt)) {
    return null;
  }

  await writeProfileTrafficSource(params.userId, params.cookie.source);
  await persistTrafficAssignment({
    visitorId: params.cookie.visitorId,
    source: params.cookie.source,
    userId: params.userId,
    utmSource: params.cookie.utmSource,
    utmMedium: params.cookie.utmMedium,
    utmCampaign: params.cookie.utmCampaign,
    referrer: params.cookie.referrer,
  });
  return params.cookie.source;
}
