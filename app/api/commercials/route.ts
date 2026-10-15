import { NextResponse } from "next/server";
import { getPublishedCommercials } from "@/lib/commercials/server";

export const revalidate = 60;

export async function GET() {
  const commercials = await getPublishedCommercials();
  return NextResponse.json({ commercials });
}
