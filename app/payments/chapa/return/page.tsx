import type { Metadata } from "next";
import { ChapaReturnStatus } from "@/components/payments/ChapaReturnStatus";

export const metadata: Metadata = {
  title: "Confirming payment — ReelWalia",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface ChapaReturnPageProps {
  searchParams: { tx_ref?: string; trx_ref?: string };
}

export default function ChapaReturnPage({ searchParams }: ChapaReturnPageProps) {
  const txRef = searchParams.tx_ref ?? searchParams.trx_ref ?? "";
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <ChapaReturnStatus txRef={txRef} />
    </main>
  );
}
