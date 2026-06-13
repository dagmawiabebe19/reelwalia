import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe/server";
import type { StripePlanKey } from "@/lib/stripe/plans";

const VALID_PLANS: StripePlanKey[] = ["1week", "2week", "1month"];

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      plan?: StripePlanKey;
      episodeId?: string;
    };

    if (!body.plan || !VALID_PLANS.includes(body.plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const successUrl = body.episodeId
      ? `${siteUrl}/watch/${body.episodeId}?subscribed=true`
      : `${siteUrl}/account?subscribed=true`;
    const cancelUrl = body.episodeId
      ? `${siteUrl}/watch/${body.episodeId}`
      : `${siteUrl}/account`;

    const session = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      plan: body.plan,
      successUrl,
      cancelUrl,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Failed to create checkout URL" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
