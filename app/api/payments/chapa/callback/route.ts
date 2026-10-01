import { NextResponse } from "next/server";
import { fulfillChapaPayment } from "@/lib/payments/chapa/fulfill";

export const dynamic = "force-dynamic";

const TX_REF_RE = /^[A-Za-z0-9._-]{1,100}$/;

/**
 * Chapa server-to-server callback (GET ?trx_ref=…&ref_id=…&status=…).
 * The query params are untrusted hints — fulfilment re-verifies with Chapa.
 */
async function handle(request: Request) {
  const url = new URL(request.url);
  const txRef = url.searchParams.get("trx_ref") ?? url.searchParams.get("tx_ref");
  if (!txRef || !TX_REF_RE.test(txRef)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const result = await fulfillChapaPayment(txRef);
    return NextResponse.json({ ok: true, status: result.status });
  } catch (err) {
    console.error("[chapa] callback fulfil error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
