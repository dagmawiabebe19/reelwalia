import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { INQUIRY_STATUSES, type InquiryStatus } from "@/lib/commercials/constants";
import { adminError, dbError, gateCommercialsAdmin } from "@/lib/commercials/admin-server";

type Ctx = { params: { id: string } };

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await gateCommercialsAdmin();
  if (denied) return denied;

  let body: { status?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return adminError(400, "bad_request", "Invalid request.");
  }
  if (!INQUIRY_STATUSES.includes(body.status as InquiryStatus)) {
    return adminError(400, "invalid", "Invalid status.");
  }

  const { error } = await createAdminClient()
    .from("commercial_inquiries")
    .update({ status: body.status })
    .eq("id", params.id);
  if (error) return dbError(error);
  return NextResponse.json({ ok: true });
}
