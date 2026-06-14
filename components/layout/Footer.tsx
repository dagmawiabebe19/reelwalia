import Link from "next/link";
import { ReelWaliaLogo } from "@/components/brand/ReelWaliaLogo";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-black pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-14 sm:pt-16">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 sm:px-6">
        <ReelWaliaLogo variant="stacked" scale="footer" />

        <nav className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-zinc-400">
          <Link
            href="/submit"
            className="transition duration-200 hover:text-white"
          >
            Submit Your Project
          </Link>
          <span className="text-zinc-600" aria-hidden>
            •
          </span>
          <Link
            href="/privacy"
            className="transition duration-200 hover:text-white"
          >
            Privacy Policy
          </Link>
          <span className="text-zinc-600" aria-hidden>
            •
          </span>
          <Link
            href="/terms"
            className="transition duration-200 hover:text-white"
          >
            Terms of Service
          </Link>
        </nav>

        <p className="mt-6 text-xs text-zinc-500">
          &copy; {new Date().getFullYear()} Walia Studios
        </p>
      </div>
    </footer>
  );
}
