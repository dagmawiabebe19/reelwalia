import ReactMarkdown from "react-markdown";
import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { LEGAL_LAST_UPDATED, readLegalMarkdown } from "@/lib/legal";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Terms of Service — ReelWalia",
  description: "Terms governing your use of ReelWalia",
};

export default async function TermsPage() {
  const content = await readLegalMarkdown("terms.md");

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <header className="mb-10 border-b border-white/[0.08] pb-8">
          <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
            Terms of Service
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
