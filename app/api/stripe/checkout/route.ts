import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createCheckoutSession,
  createGuestCheckoutSession,
} from "@/lib/stripe/server";
import type { StripePlanKey } from "@/lib/stripe/plans";
import { getStripePriceEnvKeys } from "@/lib/stripe/prices";
import { resolveBaseUrl } from "@/lib/site-url";

const VALID_PLANS: StripePlanKey[] = ["1week", "2week", "1month"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      plan?: StripePlanKey;
      episodeId?: string;
    };

    if (!body.plan || !VALID_PLANS.includes(body.plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (process.env.NODE_ENV === "development") {
      console.log(
        "Available Stripe price keys:",
        getStripePriceEnvKeys()
      );
    }

    const baseUrl = resolveBaseUrl(request);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id && user.email) {
      const session = await createCheckoutSession({
        userId: user.id,
        email: user.email,
        plan: body.plan,
        baseUrl,
        episodeId: body.episodeId,
      });

      if (!session.url) {
        return NextResponse.json({ error: "Failed to create checkout URL" }, { status: 500 });
      }

      return NextResponse.json({ url: session.url });
    }

    // Guest checkout — account created asynchronously via webhook; never redirect to /watch?subscribed=
    const session = await createGuestCheckoutSession({
      plan: body.plan,
      baseUrl,
      episodeId: body.episodeId,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Failed to create checkout URL" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    if (message.includes("Missing Stripe price env vars")) {
      console.error(
        "Available Stripe price keys:",
        getStripePriceEnvKeys()
      );
    }
    console.error("checkout error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
