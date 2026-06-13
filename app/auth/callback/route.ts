import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // set can fail in non-mutable contexts
          }
        },
      },
    }
  );

  async function redirectForSession() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/auth/sign-in?error=callback_failed", requestUrl.origin)
      );
    }

    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectForSession();
    }
    console.error("Code exchange error:", error);
    return NextResponse.redirect(
      new URL("/auth/sign-in?error=callback_failed", requestUrl.origin)
    );
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType,
    });

    if (!error) {
      return redirectForSession();
    }
    console.error("Token verification error:", error);
    return NextResponse.redirect(
      new URL("/auth/sign-in?error=callback_failed", requestUrl.origin)
    );
  }

  return NextResponse.redirect(new URL("/auth/sign-in", requestUrl.origin));
}
