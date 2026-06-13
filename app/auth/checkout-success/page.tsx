"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function CheckoutSuccessInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const episodeId = searchParams.get("episodeId");

  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(true);

  const siteUrl =
    typeof window !== "undefined" ? window.location.origin : "";
  const watchUrl = episodeId
    ? `${siteUrl}/watch/${episodeId}?session_id=${sessionId ?? ""}`
    : `${siteUrl}/`;

  useEffect(() => {
    if (!sessionId) {
      setError("Missing checkout session.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/stripe/checkout-success", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = (await res.json()) as {
          email?: string;
          episodeId?: string;
          error?: string;
        };

        if (!res.ok || !data.email) {
          throw new Error(data.error ?? "Could not verify checkout");
        }

        if (cancelled) return;
        setEmail(data.email);

        const supabase = createClient();
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: data.email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: watchUrl,
          },
        });

        if (cancelled) return;
        if (otpError) {
          setError(otpError.message);
        } else {
          setOtpSent(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, watchUrl]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-zinc-950 p-8 text-center">
        <p className="font-display text-lg uppercase tracking-wide">
          Reel<span className="text-obsidian-red">Walia</span>
        </p>

        {loading && (
          <p className="mt-6 text-sm text-gray-400">Confirming your subscription…</p>
        )}

        {!loading && error && (
          <>
            <p className="mt-6 text-sm text-red-400">{error}</p>
            <Link href="/" className="mt-4 inline-block text-sm text-obsidian-red hover:underline">
              Back to home
            </Link>
          </>
        )}

        {!loading && !error && email && (
          <>
            <h1 className="mt-6 font-display text-2xl uppercase">Welcome!</h1>
            <p className="mt-3 text-sm text-gray-400">
              {otpSent
                ? `We sent a sign-in link to ${email}. Check your inbox to access your account anytime.`
                : `Your subscription is active for ${email}.`}
            </p>
            {episodeId && sessionId && (
              <Link
                href={`/watch/${episodeId}?session_id=${sessionId}`}
                className="rw-btn-primary mt-6 inline-flex w-full justify-center"
              >
                Continue watching
              </Link>
            )}
            <p className="mt-4 text-xs text-gray-500">
              Cancel anytime in account settings after you sign in.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-sm text-gray-400">
          Loading…
        </div>
      }
    >
      <CheckoutSuccessInner />
    </Suspense>
  );
}
