import Link from "next/link";
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
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-black/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-display text-2xl uppercase tracking-wide text-white">
          Reel<span className="text-obsidian-red">Walia</span>
        </Link>

        <nav className="flex items-center gap-4">
          {user ? (
            <Link
              href="/account"
              className="flex items-center gap-2 rounded-full border border-white/[0.08] py-1 pl-1 pr-3 transition hover:border-white/20"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-obsidian-red text-sm font-semibold">
                  {displayName?.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="hidden text-sm text-gray-400 sm:inline">{displayName}</span>
            </Link>
          ) : (
            <Link
              href="/auth/sign-in"
              className="text-sm font-medium text-white transition hover:text-obsidian-red"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
