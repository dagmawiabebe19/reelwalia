import Link from "next/link";
import { ReelWaliaLogo } from "@/components/brand/ReelWaliaLogo";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-white/[0.08]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/admin/series" className="flex items-center gap-3">
              <ReelWaliaLogo variant="lockup" scale="nav" />
              <span className="font-display text-sm uppercase tracking-wide text-zinc-500">
                Admin
              </span>
            </Link>
            <nav className="hidden items-center gap-4 text-sm sm:flex">
              <Link
                href="/admin/series"
                className="text-zinc-400 transition hover:text-white"
              >
                Series
              </Link>
              <Link
                href="/admin/submissions"
                className="text-zinc-400 transition hover:text-white"
              >
                Submissions
              </Link>
            </nav>
          </div>
          <Link href="/" className="text-sm text-gray-400 hover:text-white">
            View site
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
