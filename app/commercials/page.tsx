import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { CommercialHero } from "@/components/commercials/CommercialHero";
import { CommercialGallery } from "@/components/commercials/CommercialGallery";
import { CommercialInquiryForm } from "@/components/commercials/CommercialInquiryForm";
import {
  CommercialFooterCta,
  CommercialProcess,
  CommercialValueProps,
} from "@/components/commercials/CommercialSections";
import { CommercialPlaybackProvider } from "@/components/commercials/CommercialPlayback";
import { pickHeroCommercials } from "@/lib/commercials/constants";
import { getPublishedCommercials } from "@/lib/commercials/server";
import { isAdminUserId } from "@/lib/admin-id";
import { createClient } from "@/lib/supabase/server";

// Served publicly at /ads (next.config rewrite); /commercials redirects there.
// Renders per request (site header reads the session); the commercials query is
// cached 60s and invalidated by every admin write (revalidateTag + revalidatePath).
export const revalidate = 60;

const title = "Advertisements by ReelWalia | Hire Us";
const description =
  "Story-driven advertisements for TikTok, Reels, and Shorts from the team behind ReelWalia's dramas. See our work and get a quote.";
const ogImage = { url: "/opengraph-image", width: 1200, height: 630, alt: "ReelWalia — Stories That Move You" };

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/ads" },
  openGraph: { title, description, url: "/ads", siteName: "ReelWalia", type: "website", images: [ogImage] },
  twitter: { card: "summary_large_image", title, description, images: [ogImage] },
};

export default async function CommercialsShowcasePage() {
  const supabase = createClient();
  const [commercials, { data: auth }] = await Promise.all([getPublishedCommercials(), supabase.auth.getUser()]);
  const isAdmin = isAdminUserId(auth.user?.id);
  const heroes = pickHeroCommercials(commercials);

  return (
    <div className="commercial-page flex min-h-screen flex-col bg-commercial-bg text-white">
      <TopNav />
      {isAdmin && (
        <Link
          href="/admin/commercials"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/80 px-3.5 py-2 text-xs font-semibold text-zinc-200 shadow-xl backdrop-blur transition hover:border-commercial-red hover:text-white"
        >
          Manage advertisements
        </Link>
      )}
      <main className="flex-1">
        <CommercialPlaybackProvider>
          <CommercialHero heroes={heroes} />
          <CommercialGallery commercials={commercials} />
        </CommercialPlaybackProvider>
        <CommercialValueProps />
        <CommercialProcess />
        <CommercialInquiryForm references={commercials.map((c) => ({ id: c.id, title: c.title }))} />
        <CommercialFooterCta />
      </main>
      <Footer />
    </div>
  );
}
