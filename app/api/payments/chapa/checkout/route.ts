import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chapaInitialize, isChapaConfigured } from "@/lib/payments/chapa/client";
import { getPlanPricing, isPlanKey } from "@/lib/payments/pricing";
import { resolveBaseUrl, normalizeBaseUrl } from "@/lib/site-url";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function splitName(fullName: string | null | undefined): { first: string | null; last: string | null } {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: null, last: null };
  return { first: parts[0] ?? null, last: parts.slice(1).join(" ") || null };
}

export async function POST(request: Request) {
  if (!isChapaConfigured()) {
    console.error("[chapa] checkout attempted without CHAPA_SECRET_KEY");
    return NextResponse.json({ error: "Telebirr payments are not available right now." }, { status: 503 });
  }

  let body: { plan?: unknown; episodeId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!isPlanKey(body.plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  const plan = body.plan;
  const episodeId =
    typeof body.episodeId === "string" && UUID_RE.test(body.episodeId) ? body.episodeId : null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to pay with Telebirr.", code: "auth_required" },
      { status: 401 }
    );
  }

  // Server decides the price — never the client.
  const pricing = getPlanPricing("chapa", plan);
  const txRef = `rw-${randomUUID().replace(/-/g, "")}`;
  const admin = createAdminClient();

  const { error: insertError } = await admin.from("payments").insert({
    user_id: user.id,
    provider: "chapa",
    provider_tx_ref: txRef,
    plan,
    amount_minor: pricing.amountMinor,
    currency: pricing.currency,
    period_days: pricing.periodDays,
    status: "pending",
    episode_id: episodeId,
  });
  if (insertError) {
    console.error("[chapa] pending payment insert failed:", insertError.message);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }

  const baseUrl = resolveBaseUrl(request);
  const returnBase = normalizeBaseUrl(
    process.env.NEXT_PUBLIC_CHAPA_RETURN_URL?.trim() || `${baseUrl}/payments/chapa/return`
  );
  const returnUrl = `${returnBase}?tx_ref=${encodeURIComponent(txRef)}`;
  const callbackUrl = `${baseUrl}/api/payments/chapa/callback`;

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const name = splitName(profile?.display_name ?? (user.user_metadata?.full_name as string | undefined));

  try {
    const { checkoutUrl } = await chapaInitialize({
      amount: pricing.amount,
      currency: "ETB",
      txRef,
      email: user.email ?? null,
      firstName: name.first,
      lastName: name.last,
      callbackUrl,
      returnUrl,
      title: "ReelWalia",
      description: `ReelWalia ${plan} pass`,
    });
    return NextResponse.json({ url: checkoutUrl, txRef });
  } catch (err) {
    console.error("[chapa] initialize failed:", err);
    await admin
      .from("payments")
      .update({ status: "failed", failure_reason: "initialize failed" })
      .eq("provider", "chapa")
      .eq("provider_tx_ref", txRef);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 502 });
  }
}
