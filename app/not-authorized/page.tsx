import Link from "next/link";
import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";

export const metadata: Metadata = {
  title: "Not authorized — ReelWalia",
  description: "You do not have permission to access this area.",
};

export default function NotAuthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="font-display text-xl uppercase tracking-wide">
          Reel<span className="text-obsidian-red">Walia</span>
        </p>
        <h1 className="mt-6 font-display text-3xl uppercase">Not authorized</h1>
        <p className="mt-3 text-sm text-gray-400">
          This area is for Walia Studios admins only. If you believe this is a
          mistake, contact support.
        </p>
        <Link href="/" className="rw-btn-primary mt-8 px-6 py-2.5">
          Back to home
        </Link>
      </main>
      <Footer />
    </div>
  );
}
