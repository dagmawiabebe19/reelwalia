"use client";

import { useEffect, useState } from "react";
import {
  VIEWS_PROOF_DISMISS_COOKIE,
  VIEWS_PROOF_LABEL,
} from "@/lib/social-proof";

function readDismissed(): boolean {
  if (typeof document === "undefined") return true;
  return document.cookie
    .split(";")
    .some((part) => part.trim().startsWith(`${VIEWS_PROOF_DISMISS_COOKIE}=1`));
}

function writeDismissed(): void {
  // Session cookie — no Max-Age / Expires → clears when the browser session ends.
  document.cookie = `${VIEWS_PROOF_DISMISS_COOKIE}=1; path=/; SameSite=Lax`;
}

/**
 * Slim site-wide trust strip. Dismissible for the browser session only.
 */
export function SocialProofBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!readDismissed()) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      data-social-proof-banner
      className="relative border-b border-obsidian-red/25 bg-gradient-to-r from-obsidian-red/15 via-black to-obsidian-red/10"
      role="status"
    >
      <div className="mx-auto flex h-8 max-w-7xl items-center justify-center gap-2 px-10 sm:h-9 sm:px-12">
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 shrink-0 fill-obsidian-red sm:h-4 sm:w-4"
          aria-hidden
        >
          <path d="M8 5v14l11-7z" />
        </svg>
        <p className="truncate text-center text-[11px] font-semibold tracking-wide text-white/90 sm:text-xs">
          {VIEWS_PROOF_LABEL}
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          writeDismissed();
          setVisible(false);
        }}
        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white sm:right-3"
        aria-label="Dismiss views banner"
      >
        <span className="text-sm leading-none" aria-hidden>
          ×
        </span>
      </button>
    </div>
  );
}
