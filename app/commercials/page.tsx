import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { CommercialHero } from "@/components/commercials/CommercialHero";
import { CommercialGallery } from "@/components/commercials/CommercialGallery";
import { CommercialInquiryForm } from "@/components/commercials/CommercialInquiryForm";
import {
  CommercialFooterCta,
  CommercialProcess,
  CommercialValueProps,
} from "@/components/commercials/CommercialSections";
import { getPublishedCommercials } from "@/lib/commercials/server";

// Served publicly at /ads (next.config rewrite); /commercials redirects there.
export const revalidate = 60;

const title = "Commercials by ReelWalia | Hire Us";
const description =
  "Vertical-first, story-driven commercials for TikTok, Reels, and Shorts from the team behind ReelWalia's dramas. See our work and get a quote.";
const ogImage = { url: "/opengraph-image", width: 1200, height: 630, alt: "ReelWalia — Stories That Move You" };

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/ads" },
  openGraph: { title, description, url: "/ads", siteName: "ReelWalia", type: "website", images: [ogImage] },
  twitter: { card: "summary_large_image", title, description, images: [ogImage] },
};

export default async function CommercialsShowcasePage() {
  const commercials = await getPublishedCommercials();
  const featured = commercials.find((c) => c.is_featured) ?? null;

  return (
    <div className="commercial-page flex min-h-screen flex-col bg-commercial-bg text-white">
      <main className="flex-1">
        <CommercialHero featured={featured} />
        <CommercialGallery commercials={commercials} />
        <CommercialValueProps />
        <CommercialProcess />
        <CommercialInquiryForm references={commercials.map((c) => ({ id: c.id, title: c.title }))} />
        <CommercialFooterCta />
      </main>
      <Footer />
    </div>
  );
}
