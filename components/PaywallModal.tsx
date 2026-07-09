"use client";

import { useEffect, useRef, useState } from "react";
import {
  STRIPE_PLANS,
  formatUsd,
  getPlanDisplay,
  savingsBadge,
  type StripePlanKey,
} from "@/lib/stripe/plans";
import {
  formatSeriesUnlockPrice,
  formatSocialProofCount,
  getSeriesUnlockPrice,
  GENERIC_CLIFFHANGER_HOOK,
} from "@/lib/paywall-config";
import {
  trackPaywallViewed,
  trackSeriesUnlockCheckoutStarted,
  trackSubscriptionCheckoutStarted,
  type PaywallTrigger,
} from "@/lib/analytics/funnel";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ReelWaliaLogo } from "@/components/brand/ReelWaliaLogo";

export interface LockedEpisodePreview {
  episodeNumber: number;
  thumbnailUrl: string | null;
}

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  episodeId?: string;
  seriesId?: string;
  seriesSlug?: string;
  seriesTitle?: string;
  /** The current locked episode number (drives the cliffhanger headline). */
  episodeNumber?: number;
  totalEpisodes?: number;
  freeEpisodeCount?: number;
  lockedEpisodes?: LockedEpisodePreview[];
  cliffhangerHook?: string | null;
  trigger?: PaywallTrigger;
  isAuthenticated?: boolean;
}

type PendingAction = null | "unlock" | StripePlanKey;

function lockedRangeLabel(lockedEpisodes: LockedEpisodePreview[]): string | null {
  if (lockedEpisodes.length === 0) return null;
  const numbers = lockedEpisodes.map((e) => e.episodeNumber);
  const first = Math.min(...numbers);
  const last = Math.max(...numbers);
  return first === last ? `Episode ${first}` : `Episodes ${first}-${last}`;
}

export function PaywallModal({
  open,
  onClose,
  episodeId,
  seriesId,
  seriesSlug,
  seriesTitle,
  episodeNumber,
  totalEpisodes,
  lockedEpisodes = [],
  cliffhangerHook,
  trigger,
  isAuthenticated = false,
}: PaywallModalProps) {
  const [pending, setPending] = useState<PendingAction>(null);
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

  const canUnlockSeries = !!seriesId;
  const unlockCount = totalEpisodes && totalEpisodes > 0 ? totalEpisodes : null;
  const headline =
    episodeNumber != null
      ? `See what happens next — unlock Episode ${episodeNumber}`
      : "Unlock every episode";
  const hookLine = cliffhangerHook?.trim() || GENERIC_CLIFFHANGER_HOOK;
  const rangeLabel = lockedRangeLabel(lockedEpisodes);
  const unlockButtonLabel = unlockCount
    ? `Unlock all ${unlockCount} episodes — ${formatSeriesUnlockPrice()}`
    : `Unlock all episodes — ${formatSeriesUnlockPrice()}`;

  const startCheckout = async (
    action: Exclude<PendingAction, null>,
    body: Record<string, unknown>
  ) => {
    if (checkoutStartedRef.current) return;
    checkoutStartedRef.current = true;
    setPending(action);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        checkoutStartedRef.current = false;
        throw new Error(data.error ?? "Checkout failed");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setPending(null);
    }
  };

  const handleUnlockSeries = () => {
    trackSeriesUnlockCheckoutStarted({
      series_id: seriesId ?? "",
      price_amount: getSeriesUnlockPrice(),
      currency: "usd",
      episode_id: episodeId,
    });
    void startCheckout("unlock", {
      kind: "series_unlock",
      seriesId,
      episodeId,
    });
  };

  const handleSubscribe = (plan: StripePlanKey) => {
    const display = getPlanDisplay(plan);
    trackSubscriptionCheckoutStarted({
      plan,
      price_amount: display.amount,
      currency: "usd",
      episode_id: episodeId,
    });
    void startCheckout(plan, { kind: "subscription", plan, episodeId });
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
        <div className="mb-4 flex items-start justify-between">
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
          {headline}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-300">{hookLine}</p>

        {lockedEpisodes.length > 0 && (
          <div className="mt-4">
            <div className="flex gap-2 overflow-hidden">
              {lockedEpisodes.slice(0, 5).map((ep) => (
                <div
                  key={ep.episodeNumber}
                  className="relative aspect-[9/16] w-full flex-1 overflow-hidden rounded-md border border-white/10 bg-zinc-900"
                >
                  {ep.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ep.thumbnailUrl}
                      alt=""
                      className="h-full w-full scale-110 object-cover blur-[6px] brightness-[0.55]"
                    />
                  ) : (
                    <div className="h-full w-full bg-zinc-800" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/80" fill="currentColor">
                      <path d="M18 8h-1V6a5 5 0 00-10 0v2H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2zm-6 9a2 2 0 110-4 2 2 0 010 4zm3.1-9H8.9V6a3.1 3.1 0 016.2 0v2z" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
            {rangeLabel && (
              <p className="mt-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                🔒 {rangeLabel} locked
              </p>
            )}
          </div>
        )}

        <p className="mt-4 text-center text-xs font-medium text-obsidian-red">
          Join {formatSocialProofCount()}+ watching
        </p>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        {canUnlockSeries && (
          <div className="mt-4">
            <button
              type="button"
              disabled={pending !== null}
              onClick={handleUnlockSeries}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-obsidian-red py-4 text-base font-bold text-white transition hover:bg-obsidian-red-hover disabled:opacity-50"
            >
              {pending === "unlock" ? (
                <>
                  <LoadingSpinner className="h-5 w-5" label="Redirecting to checkout" />
                  Redirecting…
                </>
              ) : (
                unlockButtonLabel
              )}
            </button>
            <p className="mt-2 text-center text-[11px] text-gray-400">
              One-time payment{seriesTitle ? ` · ${seriesTitle}` : ""} · yours forever
            </p>
            {!isAuthenticated && (
              <p className="mt-1 text-center text-[11px] text-gray-500">
                Unlock instantly — no account needed.
              </p>
            )}
          </div>
        )}

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-[11px] uppercase tracking-widest text-gray-500">
            {canUnlockSeries ? "or subscribe to all shows" : "Choose a plan"}
          </span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {STRIPE_PLANS.map((p) => {
            const badge = savingsBadge(p);
            const isPending = pending === p.key;
            return (
              <button
                key={p.key}
                type="button"
                disabled={pending !== null}
                onClick={() => handleSubscribe(p.key)}
                className={`relative rounded-xl border p-3 text-center transition hover:-translate-y-0.5 disabled:opacity-50 ${
                  p.mostPopular
                    ? "border-obsidian-red/60 ring-1 ring-obsidian-red/50"
                    : "border-white/[0.08]"
                }`}
              >
                {p.mostPopular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-obsidian-red px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
                    Most Popular
                  </span>
                )}
                <p className="mt-1 font-display text-sm font-bold uppercase tracking-wide text-white">
                  {p.label}
                </p>
                <p className="mt-1 font-display text-lg font-bold tabular-nums text-white">
                  {formatUsd(p.amount)}
                  <span className="text-xs font-normal text-gray-400">{p.priceSuffix}</span>
                </p>
                {badge ? (
                  <span className="mt-1 inline-flex rounded bg-amber-400/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black">
                    {badge}
                  </span>
                ) : (
                  <span className="mt-1 block text-[10px] text-zinc-500">{p.renewalLabel}</span>
                )}
                {isPending && (
                  <span className="mt-2 flex items-center justify-center">
                    <LoadingSpinner className="h-4 w-4" label="Redirecting to checkout" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-500">
          Subscriptions renew automatically. Cancel anytime in your account.
        </p>
      </div>
    </div>
  );
}
