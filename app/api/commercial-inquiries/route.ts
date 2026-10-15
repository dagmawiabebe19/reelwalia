import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { INQUIRY_HONEYPOT_FIELD } from "@/lib/commercials/constants";
import { validateCommercialInquiry } from "@/lib/commercials/validation";
import { sendCommercialInquiryNotification } from "@/lib/email/commercial-inquiry-notification";
import { TRAFFIC_SOURCE_COOKIE, parseTrafficSourceCookie } from "@/lib/traffic-source";

const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60 * 60_000;

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const honeypot = body[INQUIRY_HONEYPOT_FIELD];
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const limit = checkRateLimit(`commercial-inquiry:ip:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later or email us directly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const result = validateCommercialInquiry(body);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Please check the highlighted fields.", fieldErrors: result.errors },
      { status: 400 }
    );
  }
  const inquiry = { ...result.value };

  // URL UTMs win; otherwise fall back to the first-touch attribution cookie.
  if (!inquiry.utm_source && !inquiry.utm_medium && !inquiry.utm_campaign) {
    const firstTouch = parseTrafficSourceCookie(cookies().get(TRAFFIC_SOURCE_COOKIE)?.value);
    inquiry.utm_source = firstTouch?.utmSource ?? null;
    inquiry.utm_medium = firstTouch?.utmMedium ?? null;
    inquiry.utm_campaign = firstTouch?.utmCampaign ?? null;
  }

  const admin = createAdminClient();

  let referenceTitle: string | null = null;
  if (inquiry.reference_commercial_id) {
    const { data: ref } = await admin
      .from("commercials")
      .select("id, title")
      .eq("id", inquiry.reference_commercial_id)
      .eq("is_published", true)
      .maybeSingle();
    if (ref) referenceTitle = ref.title as string;
    else inquiry.reference_commercial_id = null;
  }

  const { data: created, error } = await admin
    .from("commercial_inquiries")
    .insert(inquiry)
    .select("id")
    .single();

  if (error || !created) {
    console.error("[commercial-inquiries] insert failed:", error?.message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again or email us directly." },
      { status: 500 }
    );
  }

  await sendCommercialInquiryNotification({ ...inquiry, id: created.id as string, referenceTitle });

  return NextResponse.json({ ok: true });
}
