import Link from "next/link";
import { ReelWaliaLogo } from "@/components/brand/ReelWaliaLogo";
import { createClient } from "@/lib/supabase/server";

export async function TopNav() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let avatarUrl: string | null = null;
  let displayName: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url, display_name")
      .eq("id", user.id)
      .maybeSingle();

    avatarUrl = profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null;
    displayName =
      profile?.display_name ??
      user.user_metadata?.full_name ??
      user.email?.split("@")[0] ??
      "Account";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-black/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between px-4 sm:h-[4.75rem] sm:px-6">
        <Link
          href="/"
          className="transition duration-200 hover:opacity-90 active:opacity-80"
          aria-label="Reel Walia home"
        >
          <ReelWaliaLogo variant="lockup" scale="nav" />
        </Link>

        <nav className="flex items-center gap-3 sm:gap-4">
          {user ? (
            <Link
              href="/account"
              className="flex min-h-11 items-center gap-2 rounded-full border border-white/[0.08] py-1 pl-1 pr-3 transition duration-200 hover:border-white/25 hover:bg-white/[0.04]"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-obsidian-red text-sm font-bold">
                  {displayName?.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="hidden text-sm font-medium text-zinc-400 sm:inline">
                {displayName}
              </span>
            </Link>
          ) : (
            <Link
              href="/auth/sign-in"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition duration-200 hover:bg-white/[0.06] hover:text-obsidian-red"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
