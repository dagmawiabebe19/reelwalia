"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { confirmChapaPayment, type ConfirmChapaResult } from "@/app/payments/chapa/actions";

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 40;

type ViewState = "confirming" | "failed" | "auth_required" | "not_found" | "timeout" | "success";

export function ChapaReturnStatus({ txRef }: { txRef: string }) {
  const router = useRouter();
  const [state, setState] = useState<ViewState>(txRef ? "confirming" : "not_found");
  const attempts = useRef(0);

  useEffect(() => {
    if (!txRef) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      attempts.current += 1;
      let result: ConfirmChapaResult;
      try {
        result = await confirmChapaPayment(txRef);
      } catch {
        result = { status: "pending" };
      }
      if (cancelled) return;

      if (result.status === "success") {
        setState("success");
        router.replace(result.redirectTo);
        return;
      }
      if (result.status !== "pending") {
        setState(result.status);
        return;
      }
      if (attempts.current >= MAX_ATTEMPTS) {
        setState("timeout");
        return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [txRef, router]);

  const returnPath = `/payments/chapa/return?tx_ref=${encodeURIComponent(txRef)}`;

  return (
    <div className="w-full max-w-sm text-center" aria-live="polite">
      {(state === "confirming" || state === "success") && (
        <>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-obsidian-red" />
          <h1 className="mt-6 font-display text-2xl uppercase">
            {state === "success" ? "Payment confirmed" : "Confirming your payment…"}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {state === "success"
              ? "Taking you back to your show."
              : "This usually takes a few seconds. Please keep this page open."}
          </p>
        </>
      )}

      {state === "failed" && (
        <>
          <h1 className="font-display text-2xl uppercase">Payment not completed</h1>
          <p className="mt-2 text-sm text-gray-400">
            Chapa did not confirm this payment, so access wasn&apos;t unlocked. You can try again
            any time.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-obsidian-red px-6 text-sm font-semibold"
          >
            Back to ReelWalia
          </Link>
        </>
      )}

      {state === "timeout" && (
        <>
          <h1 className="font-display text-2xl uppercase">Still confirming</h1>
          <p className="mt-2 text-sm text-gray-400">
            We haven&apos;t received confirmation yet. If you completed payment, access will unlock
            automatically within a few minutes.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-obsidian-red px-6 text-sm font-semibold"
          >
            Check again
          </button>
        </>
      )}

      {state === "auth_required" && (
        <>
          <h1 className="font-display text-2xl uppercase">Sign in to finish</h1>
          <p className="mt-2 text-sm text-gray-400">
            Sign in with the account you paid from to confirm your payment.
          </p>
          <Link
            href={`/auth/sign-in?redirect=${encodeURIComponent(returnPath)}`}
            className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-obsidian-red px-6 text-sm font-semibold"
          >
            Sign in
          </Link>
        </>
      )}

      {state === "not_found" && (
        <>
          <h1 className="font-display text-2xl uppercase">Payment not found</h1>
          <p className="mt-2 text-sm text-gray-400">
            We couldn&apos;t find this payment on your account.
          </p>
          <Link
            href="/account"
            className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-obsidian-red px-6 text-sm font-semibold"
          >
            Go to account
          </Link>
        </>
      )}
    </div>
  );
}
