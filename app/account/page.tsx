import Link from "next/link";
import { redirect } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { Card } from "@/components/ui/Card";
import { signOut } from "@/app/account/actions";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, subscription_plan, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ??
    user.user_metadata?.full_name ??
    user.email?.split("@")[0] ??
    "Viewer";

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl uppercase">Account</h1>
        <p className="mt-2 text-sm text-gray-400">Manage your ReelWalia profile.</p>

        <Card className="mt-8 p-6">
          <div className="flex items-center gap-4">
            {profile?.avatar_url || user.user_metadata?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile?.avatar_url ?? user.user_metadata?.avatar_url}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-obsidian-red text-xl font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-lg font-semibold">{displayName}</p>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
          </div>
        </Card>

        <Card className="mt-4 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Subscription
          </h2>
          <p className="mt-2 capitalize">
            Plan: {profile?.subscription_plan ?? "free"}
          </p>
          <p className="text-sm capitalize text-gray-400">
            Status: {profile?.subscription_status ?? "none"}
          </p>
          <p className="mt-4 text-xs text-gray-500">
            Stripe billing — coming in Phase 2.
          </p>
        </Card>

        <Card className="mt-4 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Library
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-400">
            <li>Watch history — placeholder</li>
            <li>Watchlist — placeholder</li>
          </ul>
        </Card>

        <div className="mt-8 flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-400 hover:text-white">
            Back home
          </Link>
          <form action={signOut}>
            <button type="submit" className="text-sm text-obsidian-red hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
