"use client";

import Link from "next/link";
import { ReelWaliaLogo } from "@/components/brand/ReelWaliaLogo";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
      <ReelWaliaLogo variant="stacked" scale="auth" />
      <h1 className="mt-10 font-display text-2xl uppercase sm:text-3xl">Something went wrong</h1>
      <p className="mt-3 max-w-md text-sm text-gray-400">
        Refresh to try again. If the problem continues, return to the home page.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => reset()} className="rw-btn-secondary px-6 py-2 text-sm">
          Try again
        </button>
        <Link href="/" className="rw-btn-primary px-6 py-2 text-sm">
          Back to home
        </Link>
      </div>
    </div>
  );
}
