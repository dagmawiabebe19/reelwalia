import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createCheckoutSession,
  createGuestCheckoutSession,
  createGuestSeriesUnlockCheckoutSession,
  createSeriesUnlockCheckoutSession,
} from "@/lib/stripe/server";
import { isStripePlanKey, type StripePlanKey } from "@/lib/stripe/plans";
import { getStripePriceEnvKeys } from "@/lib/stripe/prices";
import { resolveBaseUrl } from "@/lib/site-url";

interface CheckoutBody {
  kind?: "subscription" | "series_unlock";
  plan?: StripePlanKey;
  seriesId?: string;
  episodeId?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const kind = body.kind ?? "subscription";

    if (process.env.NODE_ENV === "development") {
      console.log("Available Stripe price keys:", getStripePriceEnvKeys());
    }

    const baseUrl = resolveBaseUrl(request);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (kind === "series_unlock") {
      if (!body.seriesId) {
        return NextResponse.json({ error: "Missing seriesId" }, { status: 400 });
      }

      const session =
        user?.id && user.email
          ? await createSeriesUnlockCheckoutSession({
              userId: user.id,
              email: user.email,
              seriesId: body.seriesId,
              baseUrl,
              episodeId: body.episodeId,
            })
          : await createGuestSeriesUnlockCheckoutSession({
              seriesId: body.seriesId,
              baseUrl,
              episodeId: body.episodeId,
            });

      if (!session.url) {
        return NextResponse.json({ error: "Failed to create checkout URL" }, { status: 500 });
      }
      return NextResponse.json({ url: session.url });
    }

    // Subscription checkout.
    if (!body.plan || !isStripePlanKey(body.plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const session =
      user?.id && user.email
        ? await createCheckoutSession({
            userId: user.id,
            email: user.email,
            plan: body.plan,
            baseUrl,
            episodeId: body.episodeId,
          })
        : // Guest checkout — account created asynchronously via webhook; never redirect to /watch?subscribed=
          await createGuestCheckoutSession({
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
    if (message.includes("Missing Stripe price env var")) {
      console.error("Available Stripe price keys:", getStripePriceEnvKeys());
    }
    console.error("checkout error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
