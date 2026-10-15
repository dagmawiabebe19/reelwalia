import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adminError,
  dbError,
  gateCommercialsAdmin,
  parseCommercialPayload,
  revalidateCommercials,
} from "@/lib/commercials/admin-server";

export async function POST(request: Request) {
  const denied = await gateCommercialsAdmin();
  if (denied) return denied;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return adminError(400, "bad_request", "Invalid request.");
  }

  const parsed = parseCommercialPayload(raw, "create");
  if (!parsed.ok) return adminError(400, "invalid", parsed.error);

  const { data, error } = await createAdminClient()
    .from("commercials")
    .insert(parsed.value)
    .select("id")
    .single();
  if (error || !data) return dbError(error ?? { message: "insert returned no row" });

  revalidateCommercials();
  return NextResponse.json({ id: data.id as string });
}
