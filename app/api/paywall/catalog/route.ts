import { NextResponse } from "next/server";
import { listPaywallCatalogPosters } from "@/lib/paywall-catalog-server";

export const revalidate = 120;

export async function GET() {
  const posters = await listPaywallCatalogPosters();
  return NextResponse.json({ posters });
}
