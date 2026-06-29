"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ReelWaliaLogo } from "@/components/brand/ReelWaliaLogo";

type NavItem = {
  href: string;
  label: string;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Catalog",
    items: [
      { href: "/admin/series", label: "Series" },
      { href: "/admin/submissions", label: "Submissions" },
    ],
  },
  {
    label: "Revenue",
    items: [
      { href: "/admin/sales", label: "Sales" },
      { href: "/admin/users", label: "Users" },
    ],
  },
];

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/admin/series") {
    return pathname === href || pathname.startsWith("/admin/series/");
  }
  if (href === "/admin/submissions") {
    return pathname === href || pathname.startsWith("/admin/submissions/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto py-2">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label} className="rw-admin-nav-section">
          <p className="rw-admin-nav-label">{section.label}</p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActiveRoute(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`rw-admin-nav-link ${active ? "rw-admin-nav-link-active" : ""}`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function AccountFooter({ adminEmail }: { adminEmail: string }) {
  const initial = adminEmail.charAt(0).toUpperCase();

  return (
    <div className="border-t border-white/[0.08] p-4">
      <div className="rw-admin-account-chip">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-obsidian-red/15 text-sm font-semibold text-obsidian-red">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{adminEmail}</p>
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Admin</p>
        </div>
      </div>
      <Link
        href="/"
        className="mt-3 block text-center text-xs text-zinc-500 transition hover:text-white"
      >
        View site →
      </Link>
    </div>
  );
}

export function AdminShell({
  adminEmail,
  children,
}: {
  adminEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="rw-admin-shell">
      <aside className="rw-admin-sidebar hidden lg:flex">
        <div className="rw-admin-sidebar-brand">
          <Link href="/admin/series" className="inline-flex">
            <ReelWaliaLogo variant="lockup" scale="nav" />
          </Link>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
            Studio Admin
          </p>
        </div>
        <SidebarNav />
        <AccountFooter adminEmail={adminEmail} />
      </aside>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/[0.08] bg-[#050505] transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="rw-admin-sidebar-brand flex items-center justify-between">
          <Link href="/admin/series" className="inline-flex" onClick={() => setMobileOpen(false)}>
            <ReelWaliaLogo variant="lockup" scale="nav" />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <SidebarNav onNavigate={() => setMobileOpen(false)} />
        <AccountFooter adminEmail={adminEmail} />
      </aside>

      <div className="rw-admin-main">
        <header className="rw-admin-topbar">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md border border-white/[0.12] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-300"
            aria-label="Open navigation"
          >
            Menu
          </button>
          <Link href="/" className="text-xs text-zinc-500 hover:text-white">
            View site
          </Link>
        </header>
        <main className="rw-admin-content">{children}</main>
      </div>
    </div>
  );
}
