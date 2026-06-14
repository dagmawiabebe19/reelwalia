import Link from "next/link";
import { ReelWaliaLogo } from "@/components/brand/ReelWaliaLogo";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] py-10 sm:py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 text-center sm:gap-6 sm:px-6">
        <ReelWaliaLogo variant="lockup-tagline" markClassName="h-10 w-10" />

        <nav className="flex flex-col flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:flex-row">
          <Link
            href="/privacy"
            className="text-sm text-zinc-400 transition duration-200 hover:text-white"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-sm text-zinc-400 transition duration-200 hover:text-white"
          >
            Terms of Service
          </Link>
        </nav>

        <p className="text-xs text-zinc-500">
          &copy; {new Date().getFullYear()} Walia Studios. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
