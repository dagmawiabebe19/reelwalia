"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
      <h1 className="font-display text-2xl uppercase">Something went wrong</h1>
      <p className="mt-3 max-w-md text-sm text-gray-400">
        Refresh to try again. If the problem continues, return to the home page.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rw-btn-primary px-6 py-2 text-sm"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded border border-white/20 px-6 py-2 text-sm transition hover:border-white/40"
        >
          Home
        </a>
      </div>
    </div>
  );
}
