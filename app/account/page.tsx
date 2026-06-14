import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ManageSubscriptionButton } from "@/components/account/ManageSubscriptionButton";
import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { Card } from "@/components/ui/Card";
import { signOut } from "@/app/account/actions";
import { hasActiveSubscription } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

interface AccountPageProps {
  searchParams: { subscribed?: string };
}

export const metadata: Metadata = {
  title: "Account — ReelWalia",
  description: "Manage your ReelWalia profile and subscription.",
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?redirect=/account");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, avatar_url, subscription_plan, subscription_status, current_period_end"
    )
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ??
    user.user_metadata?.full_name ??
    user.email?.split("@")[0] ??
    "Viewer";

  const isActive = hasActiveSubscription(profile);
  const justSubscribed = searchParams.subscribed === "true";

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl uppercase">Account</h1>
        <p className="mt-2 text-sm text-gray-400">Manage your ReelWalia profile.</p>

        {justSubscribed && (
          <p className="mt-4 rounded-lg border border-obsidian-red/30 bg-obsidian-red/10 px-4 py-3 text-sm text-obsidian-red">
            Subscription activated! Enjoy full access to every series.
          </p>
        )}

        <Card className="mt-8 p-4 sm:p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            {profile?.avatar_url || user.user_metadata?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile?.avatar_url ?? user.user_metadata?.avatar_url}
                alt={`${displayName} avatar`}
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

        <Card className="mt-4 p-4 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Subscription
          </h2>
          <p className="mt-2 capitalize">
            Plan: {profile?.subscription_plan ?? "free"}
          </p>
          <p className="text-sm capitalize text-gray-400">
            Status: {profile?.subscription_status ?? "none"}
          </p>
          {profile?.current_period_end && isActive && (
            <p className="mt-1 text-xs text-gray-500">
              Renews{" "}
              {new Date(profile.current_period_end).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
          {isActive && <ManageSubscriptionButton />}
          {!isActive && (
            <p className="mt-4 text-xs text-gray-500">
              Subscribe from any locked episode to unlock the full catalog.
            </p>
          )}
        </Card>

        <Card className="mt-4 p-4 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Library
          </h2>
          <p className="mt-3 text-sm text-gray-400">
            Watch history and saved series are coming soon. Keep watching — your
            progress is saved automatically while you stream.
          </p>
          <p className="mt-2 text-xs text-gray-500">Coming soon</p>
        </Card>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link href="/" className="inline-flex min-h-11 items-center text-sm text-gray-400 hover:text-white">
            Back home
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center text-sm text-obsidian-red hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
