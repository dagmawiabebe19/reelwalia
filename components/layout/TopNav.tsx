import Link from "next/link";
import { ReelWaliaLogo } from "@/components/brand/ReelWaliaLogo";
import { SiteNavMenu } from "@/components/layout/SiteNavMenu";
import { SocialProofBanner } from "@/components/layout/SocialProofBanner";
import { isAdminUserId } from "@/lib/admin-id";
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
    <header
      data-site-header
      className="sticky top-0 z-50 border-b border-white/[0.08] bg-black/90 pt-[env(safe-area-inset-top)] backdrop-blur-md"
    >
      <SocialProofBanner />
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between px-4 sm:h-[4.75rem] sm:px-6">
        <Link
          href="/"
          className="transition duration-200 hover:opacity-90 active:opacity-80"
          aria-label="Reel Walia home"
        >
          <ReelWaliaLogo variant="lockup" scale="nav" />
        </Link>

        <SiteNavMenu
          signedIn={Boolean(user)}
          isAdmin={isAdminUserId(user?.id)}
          avatarUrl={avatarUrl}
          displayName={displayName}
        />
      </div>
    </header>
  );
}
