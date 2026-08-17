import { type NextRequest } from "next/server";
import { applyPaywallAbCookie } from "@/lib/paywall-ab-middleware";
import { applyTrafficSourceCookie } from "@/lib/traffic-source-middleware";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const withTraffic = applyTrafficSourceCookie(request, response, userId);
  return applyPaywallAbCookie(request, withTraffic, userId);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
