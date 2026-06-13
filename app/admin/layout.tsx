import Link from "next/link";
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
          <Link href="/admin/series" className="font-display text-lg uppercase">
            Reel<span className="text-obsidian-red">Walia</span> Admin
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white">
            View site
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
