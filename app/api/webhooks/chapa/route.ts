import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyChapaWebhookSignature } from "@/lib/payments/chapa/signature";
import { fulfillChapaPayment, revokeChapaPayment } from "@/lib/payments/chapa/fulfill";

export const dynamic = "force-dynamic";

type ChapaWebhookPayload = {
  event?: string;
  type?: string;
  status?: string;
  tx_ref?: string;
  trx_ref?: string;
  reference?: string;
  [key: string]: unknown;
};

export async function POST(request: Request) {
  const rawBody = await request.text();

  const valid = verifyChapaWebhookSignature({
    rawBody,
    xChapaSignature: request.headers.get("x-chapa-signature"),
    chapaSignature: request.headers.get("chapa-signature"),
  });
  if (!valid) {
    console.warn("[chapa webhook] invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: ChapaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as ChapaWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const eventType = String(payload.event ?? payload.type ?? "").toLowerCase();
  const txRef = payload.tx_ref ?? payload.trx_ref ?? null;
  const status = String(payload.status ?? "").toLowerCase();

  // Payout events and anything without a tx_ref are not ours to process.
  if (!txRef || eventType.startsWith("payout")) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const eventId = `${eventType || "unknown"}:${txRef}:${status || "none"}`;
  const admin = createAdminClient();

  const { data: seen } = await admin
    .from("processed_webhook_events")
    .select("id")
    .eq("provider", "chapa")
    .eq("event_id", eventId)
    .maybeSingle();
  if (seen) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (eventType === "charge.refunded" || status === "refunded") {
      await revokeChapaPayment(txRef, "refunded", payload);
    } else if (eventType === "charge.reversed" || status === "reversed") {
      await revokeChapaPayment(txRef, "reversed", payload);
    } else if (eventType.startsWith("charge.") || status) {
      // Success, failed, and cancelled all go through verify — the webhook is a
      // trigger, Chapa's verify endpoint is the source of truth.
      const result = await fulfillChapaPayment(txRef, { rawEvent: payload });
      if (result.status === "pending" && eventType === "charge.success") {
        // Verify not settled yet — let Chapa retry rather than recording as processed.
        return NextResponse.json({ error: "Retry" }, { status: 503 });
      }
    }
  } catch (err) {
    console.error("[chapa webhook] processing failed:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  const { error: insertError } = await admin.from("processed_webhook_events").insert({
    provider: "chapa",
    event_id: eventId,
    event_type: eventType || null,
  });
  if (insertError && insertError.code !== "23505") {
    console.warn("[chapa webhook] could not record event:", insertError.message);
  }

  return NextResponse.json({ received: true });
}
