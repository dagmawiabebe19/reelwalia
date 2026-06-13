import { NextResponse } from "next/server";
import { verifyCheckoutSession } from "@/lib/stripe/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sessionId?: string };
    if (!body.sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const verified = await verifyCheckoutSession(body.sessionId);
    if (!verified?.active || !verified.email) {
      return NextResponse.json({ error: "Checkout not complete" }, { status: 400 });
    }

    return NextResponse.json({
      email: verified.email,
      episodeId: verified.episodeId,
    });
  } catch (err) {
    console.error("checkout-success API error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
