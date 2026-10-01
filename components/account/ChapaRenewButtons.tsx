"use client";

import { useState } from "react";
import { PLAN_KEYS, formatEtb, getChapaPlan, type PlanKey } from "@/lib/payments/pricing";
import { getPlanDisplay } from "@/lib/stripe/plans";
import { startChapaCheckout } from "@/lib/payments/chapa/start-checkout";

export function ChapaRenewButtons({ label }: { label: string }) {
  const [loading, setLoading] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(plan: PlanKey) {
    setLoading(plan);
    setError(null);
    const result = await startChapaCheckout(plan, null);
    if (result.ok) {
      window.location.href = result.url;
      return;
    }
    if (result.authRequired) {
      window.location.href = `/auth/sign-in?redirect=${encodeURIComponent("/account")}`;
      return;
    }
    setError(result.message);
    setLoading(null);
  }

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {PLAN_KEYS.map((plan) => {
          const cfg = getChapaPlan(plan);
          const label = getPlanDisplay(plan).label;
          return (
            <button
              key={plan}
              type="button"
              disabled={loading !== null}
              onClick={() => handle(plan)}
              className="min-h-[48px] rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-obsidian-red/60 disabled:opacity-60"
            >
              {loading === plan ? "Redirecting…" : `${label} · ${formatEtb(cfg.etbAmount)}`}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-obsidian-red">{error}</p>}
    </div>
  );
}
