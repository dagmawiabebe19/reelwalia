"use client";

import { useEffect, useState } from "react";
import {
  STRIPE_PLANS,
  dailyPrice,
  formatUsd,
  savePercent,
  type StripePlanKey,
} from "@/lib/stripe/plans";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  episodeId?: string;
  isAuthenticated?: boolean;
}

export function PaywallModal({
  open,
  onClose,
  episodeId,
  isAuthenticated = false,
}: PaywallModalProps) {
  const [selected, setSelected] = useState<StripePlanKey>("2week");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

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

  if (!open) return null;

  const plan = STRIPE_PLANS.find((p) => p.key === selected)!;

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected, episodeId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
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
          <p className="font-display text-lg uppercase tracking-wide">
            Reel<span className="text-obsidian-red">Walia</span>
          </p>
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
            const pct = savePercent(p.introAmount, p.standardAmount);

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
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${
                    p.mostPopular
                      ? "mt-3 scale-[1.02] border-obsidian-red/60 ring-2 ring-obsidian-red"
                      : "border-white/[0.08]"
                  } ${isSelected ? "border-obsidian-red ring-2 ring-obsidian-red" : ""}`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      isSelected ? "border-obsidian-red bg-obsidian-red" : "border-gray-500"
                    }`}
                  >
                    {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold uppercase tracking-wide">{p.label}</p>
                    <span className="mt-1 inline-block rounded bg-yellow-400/90 px-1.5 py-0.5 text-[10px] font-bold uppercase text-black">
                      Save {pct}%
                    </span>
                    <p className="mt-1 text-sm">
                      <span className="text-gray-500 line-through">
                        {formatUsd(p.standardAmount)}
                      </span>{" "}
                      <span className="font-semibold text-white">
                        {formatUsd(p.introAmount)}
                      </span>
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                    {dailyPrice(p.introAmount, p.days)}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-gray-500">
          By clicking &apos;Get Full Access&apos; you will be billed{" "}
          {formatUsd(plan.introAmount)} for the first {plan.periodLabel}. Your subscription
          then auto renews for {plan.periodLabel} periods at full price (
          {formatUsd(plan.standardAmount)}).
        </p>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

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

        <p className="mt-3 text-center text-[11px] text-gray-500">
          {isAuthenticated
            ? "Cancel anytime in account settings."
            : "Enter your email in Stripe Checkout — we'll create your account automatically."}
        </p>
      </div>
    </div>
  );
}
