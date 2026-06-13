import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
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

export const metadata: Metadata = {
  title: "ReelWalia — Vertical drama streaming",
  description:
    "Bite-sized vertical dramas from Walia Studios. Watch anywhere, one episode at a time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-black">
      <body className={`${inter.variable} ${anton.variable} min-h-screen bg-black text-white`}>
        {children}
      </body>
    </html>
  );
}
