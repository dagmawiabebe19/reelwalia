import { WaliaIbexLogo } from "@/components/brand/WaliaIbexLogo";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 text-center sm:px-6">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <WaliaIbexLogo className="h-5 w-5" />
          <span>A Walia Studios production</span>
        </div>
        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Walia Studios. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
