import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminUserId } from "@/lib/admin-id";

export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  userId: string | null;
}> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  const pathname = request.nextUrl.pathname;
  // /watch/* is public — free episodes play without auth; premium shows paywall in-page
  const isAdminRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isAccountRoute = pathname === "/account" || pathname.startsWith("/account/");

  if (isAccountRoute && !user) {
    const signIn = new URL("/auth/sign-in", request.url);
    signIn.searchParams.set("redirect", pathname);
    return { response: NextResponse.redirect(signIn), userId: null };
  }

  if (isAdminRoute && pathname.startsWith("/api/admin")) {
    if (!user) {
      return {
        response: NextResponse.json({ error: "Not signed in", code: "not_signed_in" }, { status: 401 }),
        userId: null,
      };
    }
    if (!isAdminUserId(user.id)) {
      return {
        response: NextResponse.json({ error: "Not authorized", code: "not_admin" }, { status: 403 }),
        userId,
      };
    }
  }

  if (isAdminRoute) {
    if (!user) {
      const signIn = new URL("/auth/sign-in", request.url);
      signIn.searchParams.set("next", pathname);
      return { response: NextResponse.redirect(signIn), userId: null };
    }

    if (!isAdminUserId(user.id)) {
      return {
        response: NextResponse.redirect(new URL("/not-authorized", request.url)),
        userId,
      };
    }
  }

  return { response: supabaseResponse, userId };
}
