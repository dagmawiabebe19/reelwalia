import Link from "next/link";
import { WaliaIbexLogo } from "@/components/brand/WaliaIbexLogo";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 text-center sm:px-6">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <WaliaIbexLogo className="h-5 w-5" />
          <span>A Walia Studios production</span>
        </div>

        <nav className="flex flex-col flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:flex-row">
          <Link
            href="/privacy"
            className="text-xs text-gray-400 transition hover:text-white"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-xs text-gray-400 transition hover:text-white"
          >
            Terms of Service
          </Link>
          <a
            href="mailto:dagmawiabebe19@gmail.com"
            className="text-xs text-gray-400 transition hover:text-white"
          >
            Contact: dagmawiabebe19@gmail.com
          </a>
        </nav>

        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Walia Studios. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
