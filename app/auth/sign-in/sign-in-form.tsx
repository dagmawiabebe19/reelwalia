"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMagicLinkAction } from "@/app/auth/sign-in/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ReelWaliaLogo } from "@/components/brand/ReelWaliaLogo";

function CheckIcon() {
  return (
    <svg
      className="mx-auto h-12 w-12 text-obsidian-red"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
    >
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" />
      <path
        d="M14 24l7 7 13-14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const err = searchParams.get("error");
  const redirectTo = searchParams.get("redirect") ?? searchParams.get("next") ?? "/";

  const buildCallbackUrl = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      router.replace(redirectTo);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, supabase, redirectTo]);

  const signInMagicLink = async () => {
    setMessage(null);
    if (!email.trim()) {
      setMessage("Enter your email address.");
      return;
    }
    setLoading(true);
    const result = await sendMagicLinkAction(email.trim(), redirectTo);
    setLoading(false);
    if ("error" in result) {
      setMessage(result.error);
      return;
    }
    setSentTo(email.trim());
    setSent(true);
  };

  const signInGoogle = async () => {
    setMessage(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildCallbackUrl(),
      },
    });
    setLoading(false);
    if (error) setMessage(error.message);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-black p-6 sm:p-8">
        <ReelWaliaLogo variant="stacked" scale="auth" className="mx-auto" />
        <h1 className="mt-8 text-center font-display text-2xl uppercase tracking-wide sm:mt-10 sm:text-3xl">
          Sign In
        </h1>
        <p className="mt-2 text-center text-sm text-gray-400">
          Stream bite-sized vertical dramas from Walia Studios. Sign in to save
          your progress and manage your subscription.
        </p>

        {err === "callback_failed" && (
          <p className="mt-4 rounded-lg border border-obsidian-red/35 bg-obsidian-red/10 px-3 py-2 text-sm text-red-200">
            Sign-in did not complete. Try requesting a new magic link.
          </p>
        )}

        {sent ? (
          <div className="mt-8 space-y-4 text-center">
            <CheckIcon />
            <h3 className="text-lg font-semibold">Check your email</h3>
            <p className="text-sm">
              We sent a magic link to{" "}
              <span className="font-medium text-obsidian-red">{sentTo}</span>
            </p>
            <p className="text-sm text-gray-400">
              Click the link in your email to sign in.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setSentTo("");
                setMessage(null);
              }}
              className="text-sm text-gray-400 underline hover:text-white"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => void signInGoogle()}
              className="rw-btn-primary mt-8 flex min-h-11 w-full items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner className="h-5 w-5" label="Signing in" />
                  Connecting…
                </>
              ) : (
                "Continue with Google"
              )}
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.08]" />
              <span className="text-xs text-gray-400">or</span>
              <div className="h-px flex-1 bg-white/[0.08]" />
            </div>

            <label className="block space-y-2 text-sm">
              <span className="text-gray-400">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border border-white/[0.08] bg-black px-3 py-3 text-base text-white outline-none transition focus:border-obsidian-red focus:ring-2 focus:ring-obsidian-red/30"
              />
            </label>

            <button
              type="button"
              disabled={loading}
              onClick={() => void signInMagicLink()}
              className="rw-btn-secondary mt-4 min-h-11 w-full"
            >
              {loading ? "Sending link…" : "Continue with magic link"}
            </button>

            {message && (
              <p className="mt-4 text-center text-sm text-red-300">{message}</p>
            )}
          </>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">
          <Link href="/" className="text-obsidian-red hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

export function SignInPageClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-black">
          <ReelWaliaLogo variant="stacked" scale="loading" />
          <LoadingSpinner />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
