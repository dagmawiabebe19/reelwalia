import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
      <p className="font-display text-xl uppercase tracking-wide">
        Reel<span className="text-obsidian-red">Walia</span>
      </p>
      <h1 className="mt-6 font-display text-3xl uppercase">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-gray-400">
        This episode or page doesn&apos;t exist. Head back home to keep watching.
      </p>
      <Link href="/" className="rw-btn-primary mt-8 px-6 py-2.5">
        Back to home
      </Link>
    </div>
  );
}
