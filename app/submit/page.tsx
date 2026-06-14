import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { CreatorSubmissionForm } from "@/components/submit/CreatorSubmissionForm";
import { BRAND_TAGLINE } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Submit Your Project — ReelWalia",
  description:
    "Submit your vertical series, short-form drama, or original show to ReelWalia for consideration.",
};

export default function SubmitPage() {
  return (
    <div className="flex min-h-screen flex-col bg-black">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-10 border-b border-white/[0.08] pb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-obsidian-red">
            Creator Submission
          </p>
          <h1 className="mt-3 font-display text-3xl uppercase tracking-wide sm:text-4xl">
            Bring Your Story To ReelWalia
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Have a vertical series, short-form drama, documentary, or original
            show? We&apos;re looking for compelling stories from filmmakers
            around the world.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Submit your project below for consideration. {BRAND_TAGLINE}.
          </p>
        </header>

        <CreatorSubmissionForm />
      </main>
      <Footer />
    </div>
  );
}
