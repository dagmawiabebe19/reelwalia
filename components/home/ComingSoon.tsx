interface ComingSoonProps {
  message?: string;
}

export function ComingSoon({
  message = "New vertical dramas are on the way. Check back soon.",
}: ComingSoonProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-white/[0.08] px-6 py-16 text-center">
      <p className="font-display text-2xl uppercase text-white">Coming Soon</p>
      <p className="mt-3 max-w-md text-sm text-gray-400">{message}</p>
    </div>
  );
}
