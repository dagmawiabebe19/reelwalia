"use client";

import { useEffect, useRef, useState } from "react";
import {
  STRIPE_PLANS,
  formatDailyPrice,
  formatUsd,
  getPlanDisplay,
  savingsBadge,
  type StripePlanKey,
} from "@/lib/stripe/plans";
import {
  trackPaywallViewed,
  trackSubscriptionCheckoutStarted,
  type PaywallTrigger,
} from "@/lib/analytics/funnel";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ReelWaliaLogo } from "@/components/brand/ReelWaliaLogo";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  episodeId?: string;
  seriesSlug?: string;
  trigger?: PaywallTrigger;
  isAuthenticated?: boolean;
}

export function PaywallModal({
  open,
  onClose,
  episodeId,
  seriesSlug,
  trigger,
  isAuthenticated = false,
}: PaywallModalProps) {
  const [selected, setSelected] = useState<StripePlanKey>("1month");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paywallViewedRef = useRef(false);
  const checkoutStartedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      paywallViewedRef.current = false;
      checkoutStartedRef.current = false;
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || paywallViewedRef.current || !trigger || !episodeId || !seriesSlug) {
      return;
    }
    paywallViewedRef.current = true;
    trackPaywallViewed({
      episode_id: episodeId,
      series_slug: seriesSlug,
      trigger,
    });
  }, [open, trigger, episodeId, seriesSlug]);

  if (!open) return null;

  const handleCheckout = async () => {
    if (checkoutStartedRef.current) return;
    checkoutStartedRef.current = true;
    setLoading(true);
    setError(null);

    const plan = getPlanDisplay(selected);
    trackSubscriptionCheckoutStarted({
      plan: selected,
      price_amount: plan.amount,
      currency: "usd",
      episode_id: episodeId,
    });

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected, episodeId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        checkoutStartedRef.current = false;
        throw new Error(data.error ?? "Checkout failed");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        aria-label="Close paywall backdrop"
        onClick={onClose}
      />

      <div className="relative max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-2xl border border-white/[0.08] bg-black p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between">
          <ReelWaliaLogo variant="lockup" scale="nav" />
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/20 p-1.5 text-white hover:bg-white/10"
            aria-label="Close paywall"
          >
            ✕
          </button>
        </div>

        <h2 id="paywall-title" className="font-display text-2xl font-black leading-tight">
          Get Full Access Pass to Exclusive Drama Collections
        </h2>
        <p className="mt-2 text-sm text-gray-400">Choose your perfect plan:</p>

        <div className="mt-5 space-y-3">
          {STRIPE_PLANS.map((p) => {
            const isSelected = selected === p.key;
            const badge = savingsBadge(p);

            return (
              <div key={p.key} className="relative">
                {p.mostPopular && (
                  <div className="absolute -top-3 left-0 right-0 z-10 mx-4 rounded-t-lg bg-gradient-to-r from-obsidian-red to-red-700 px-3 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-white">
                    Most Popular
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSelected(p.key)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${
                    p.mostPopular
                      ? "mt-3 border-obsidian-red/60 ring-2 ring-obsidian-red"
                      : "border-white/[0.08]"
                  } ${isSelected ? "border-obsidian-red ring-2 ring-obsidian-red" : ""}`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      isSelected ? "border-obsidian-red bg-obsidian-red" : "border-gray-500"
                    }`}
                  >
                    {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-bold uppercase leading-tight tracking-wide">
                      {p.label}
                    </p>
                    {badge && (
                      <span className="mt-1.5 inline-flex rounded bg-amber-400/95 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
                        {badge}
                      </span>
                    )}
                  </div>

                  <div className="shrink-0 text-right leading-none">
                    <p className="whitespace-nowrap font-display text-lg font-bold tabular-nums text-white">
                      {formatUsd(p.amount)}
                    </p>
                    <p className="mt-1.5 whitespace-nowrap text-sm font-bold tabular-nums text-obsidian-red">
                      {formatDailyPrice(p)}
                    </p>
                    <p className="mt-1 whitespace-nowrap text-[10px] text-zinc-500">
                      {p.renewalLabel}
                    </p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <button
          type="button"
          disabled={loading}
          onClick={() => void handleCheckout()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-obsidian-red py-3.5 text-base font-bold text-white transition hover:bg-obsidian-red-hover disabled:opacity-50"
        >
          {loading ? (
            <>
              <LoadingSpinner className="h-5 w-5" label="Redirecting to checkout" />
              Redirecting…
            </>
          ) : (
            "Get Full Access"
          )}
        </button>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-500">
          Subscriptions renew automatically. Cancel anytime in your account.
        </p>

        {!isAuthenticated && (
          <p className="mt-2 text-center text-[11px] text-gray-500">
            Enter your email in Stripe Checkout — we&apos;ll create your account automatically.
          </p>
        )}
      </div>
    </div>
  );
}
