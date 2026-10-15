"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export const COMMERCIALS_NAV_HREF = "/ads";

function isCommercialsPath(pathname: string | null): boolean {
  return pathname === "/ads" || pathname === "/commercials";
}

function Avatar({ avatarUrl, displayName }: { avatarUrl: string | null; displayName: string | null }) {
  return avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10" />
  ) : (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-obsidian-red text-sm font-bold">
      {displayName?.charAt(0).toUpperCase()}
    </span>
  );
}

const menuItemClass =
  "flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white";

/**
 * Header links: Commercials (everyone), account dropdown, and a mobile menu.
 * Lives inside the site header, so it is hidden wherever the header is
 * (vertical feed, player fullscreen).
 */
export function SiteNavMenu({
  signedIn,
  isAdmin,
  avatarUrl,
  displayName,
}: {
  signedIn: boolean;
  isAdmin: boolean;
  avatarUrl: string | null;
  displayName: string | null;
}) {
  const pathname = usePathname();
  const commercialsActive = isCommercialsPath(pathname);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAccountOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen && !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAccountOpen(false);
        setMobileOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (accountOpen && accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [accountOpen, mobileOpen]);

  return (
    <nav className="flex items-center gap-2 sm:gap-4" aria-label="Main">
      <Link
        href={COMMERCIALS_NAV_HREF}
        aria-current={commercialsActive ? "page" : undefined}
        className={`hidden min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition duration-200 hover:bg-white/[0.06] sm:inline-flex ${
          commercialsActive ? "text-obsidian-red" : "text-zinc-300 hover:text-white"
        }`}
      >
        Advertisements
      </Link>

      {signedIn ? (
        <div ref={accountRef} className="relative hidden sm:block">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((v) => !v)}
            className="flex min-h-11 items-center gap-2 rounded-full border border-white/[0.08] py-1 pl-1 pr-3 transition duration-200 hover:border-white/25 hover:bg-white/[0.04]"
          >
            <Avatar avatarUrl={avatarUrl} displayName={displayName} />
            <span className="text-sm font-medium text-zinc-400">{displayName}</span>
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-zinc-500" fill="currentColor" aria-hidden>
              <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            </svg>
          </button>
          {accountOpen && (
            <div role="menu" className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-zinc-950 p-1.5 shadow-2xl">
              <Link role="menuitem" href="/account" className={menuItemClass}>
                Account
              </Link>
              <Link role="menuitem" href={COMMERCIALS_NAV_HREF} className={menuItemClass}>
                Advertisements
              </Link>
              {isAdmin && (
                <Link role="menuitem" href="/admin" className={`${menuItemClass} text-obsidian-red hover:text-obsidian-red`}>
                  Admin
                </Link>
              )}
            </div>
          )}
        </div>
      ) : (
        <Link
          href="/auth/sign-in"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3 text-sm font-semibold text-white transition duration-200 hover:bg-white/[0.06] hover:text-obsidian-red sm:px-4"
        >
          Sign In
        </Link>
      )}

      {signedIn && (
        <Link href="/account" aria-label="Account" className="flex min-h-11 items-center sm:hidden">
          <Avatar avatarUrl={avatarUrl} displayName={displayName} />
        </Link>
      )}

      <button
        type="button"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileOpen}
        aria-controls="site-mobile-menu"
        onClick={() => setMobileOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-200 transition hover:bg-white/[0.06] sm:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
          {mobileOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {mobileOpen && (
        <div
          id="site-mobile-menu"
          data-site-menu
          className="absolute inset-x-0 top-full border-b border-white/[0.08] bg-black/95 px-4 pb-4 pt-2 backdrop-blur-md sm:hidden"
        >
          <Link
            href={COMMERCIALS_NAV_HREF}
            aria-current={commercialsActive ? "page" : undefined}
            className={`${menuItemClass} ${commercialsActive ? "text-obsidian-red" : ""}`}
          >
            Advertisements
          </Link>
          {signedIn ? (
            <Link href="/account" className={menuItemClass}>
              Account
            </Link>
          ) : (
            <Link href="/auth/sign-in" className={menuItemClass}>
              Sign In
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className={`${menuItemClass} text-obsidian-red`}>
              Admin
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
