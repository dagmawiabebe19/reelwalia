import { NextResponse } from "next/server";
import { verifyCheckoutSession } from "@/lib/stripe/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  try {
    const verified = await verifyCheckoutSession(sessionId);
    if (!verified?.active) {
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({
      active: true,
      email: verified.email,
      episodeId: verified.episodeId,
    });
  } catch (err) {
    console.error("verify-session error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
