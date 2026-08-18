import type { Metadata, Viewport } from "next";
import { Anton, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { getSiteUrlFromEnv } from "@/lib/site-url";
import { BRAND_TAGLINE } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "900"],
});

const anton = Anton({
  subsets: ["latin"],
  variable: "--font-display",
  weight: "400",
});

const siteUrl = getSiteUrlFromEnv();
const defaultTitle = "ReelWalia — Stories That Move You";
const defaultDescription = BRAND_TAGLINE;
const ogImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Reel Walia — Stories That Move You",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: defaultTitle,
  description: defaultDescription,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: siteUrl,
    siteName: "ReelWalia",
    type: "website",
    locale: "en_US",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [ogImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-black">
      <body
        className={`${inter.variable} ${anton.variable} min-h-screen overflow-x-hidden bg-black text-base text-white`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
