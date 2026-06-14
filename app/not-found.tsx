import Link from "next/link";
import { ReelWaliaLogo } from "@/components/brand/ReelWaliaLogo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
      <ReelWaliaLogo variant="stacked" scale="auth" />
      <h1 className="mt-10 font-display text-3xl uppercase sm:text-4xl">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-gray-400">
        This episode or page doesn&apos;t exist. Head back home to keep watching.
      </p>
      <Link href="/" className="rw-btn-primary mt-8 px-6 py-2.5">
        Back to home
      </Link>
    </div>
  );
}
