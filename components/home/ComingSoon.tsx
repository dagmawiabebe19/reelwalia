import { ReelWaliaLogo } from "@/components/brand/ReelWaliaLogo";

interface ComingSoonProps {
  message?: string;
}

export function ComingSoon({
  message = "New vertical dramas are on the way. Check back soon.",
}: ComingSoonProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-white/[0.08] px-6 py-16 text-center">
      <ReelWaliaLogo variant="lockup-tagline" markClassName="h-10 w-10" />
      <p className="mt-8 font-display text-2xl uppercase tracking-wide text-white sm:text-3xl">
        Coming Soon
      </p>
      <p className="rw-body mt-4 max-w-md">{message}</p>
    </div>
  );
}
