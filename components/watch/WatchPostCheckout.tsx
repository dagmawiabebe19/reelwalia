"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

interface WatchPostCheckoutProps {
  unlocked: boolean;
  locked: boolean;
  isAuthenticated: boolean;
}

function WatchPostCheckoutInner({
  unlocked,
  locked,
  isAuthenticated,
}: WatchPostCheckoutProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const refreshed = useRef(false);

  const sessionId = searchParams.get("session_id");
  const subscribed = searchParams.get("subscribed") === "true";
  const awaitingAccess = locked && (subscribed || !!sessionId);

  useEffect(() => {
    if (!awaitingAccess || refreshed.current) return;
    refreshed.current = true;
    const timer = setTimeout(() => router.refresh(), 2000);
    return () => clearTimeout(timer);
  }, [awaitingAccess, router]);

  if (unlocked) return null;

  if (sessionId) {
    return (
      <p className="w-full max-w-md rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-center text-sm text-gray-300 lg:max-w-none">
        Verifying subscription…
      </p>
    );
  }

  if (subscribed && isAuthenticated) {
    return (
      <p className="w-full max-w-md rounded-lg border border-obsidian-red/30 bg-obsidian-red/10 px-4 py-2 text-center text-sm text-obsidian-red lg:max-w-none">
        Activating your subscription…
      </p>
    );
  }

  if (subscribed && !isAuthenticated) {
    return (
      <p className="w-full max-w-md rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-center text-sm text-gray-300 lg:max-w-none">
        Check your email for a sign-in link, or refresh this page in a moment.
      </p>
    );
  }

  return null;
}

export function WatchPostCheckout(props: WatchPostCheckoutProps) {
  return (
    <Suspense fallback={null}>
      <WatchPostCheckoutInner {...props} />
    </Suspense>
  );
}
