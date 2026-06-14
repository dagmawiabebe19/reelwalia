import ReactMarkdown from "react-markdown";
import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { LEGAL_LAST_UPDATED, readLegalMarkdown } from "@/lib/legal";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Privacy Policy — ReelWalia",
  description: "How ReelWalia and Walia Studios handle your data",
};

export default async function PrivacyPage() {
  const content = await readLegalMarkdown("privacy.md");

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <header className="mb-10 border-b border-white/[0.08] pb-8">
          <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Last updated: {LEGAL_LAST_UPDATED}
          </p>
        </header>
        <article className="prose prose-invert max-w-none prose-headings:font-display prose-headings:uppercase prose-headings:tracking-wide prose-a:text-obsidian-red">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </main>
      <Footer />
    </div>
  );
}
