import { AdminPageHeader } from "@/components/admin/admin-ui";
import { CommercialsAdmin } from "@/components/admin/commercials/CommercialsAdmin";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  COMMERCIAL_PUBLIC_COLUMNS,
  type Commercial,
  type CommercialInquiry,
} from "@/lib/commercials/constants";

export const dynamic = "force-dynamic";

export default async function AdminCommercialsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  await requireAdmin();
  const admin = createAdminClient();

  const [commercialsRes, inquiriesRes] = await Promise.all([
    admin
      .from("commercials")
      .select(COMMERCIAL_PUBLIC_COLUMNS)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    admin.from("commercial_inquiries").select("*").order("created_at", { ascending: false }).limit(500),
  ]);

  const setupError = commercialsRes.error ?? inquiriesRes.error;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Commercials"
        subtitle="Manage the public /ads showcase and incoming commercial inquiries."
      />
      {setupError ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Could not load commercials data ({setupError.message}). Apply migration{" "}
          <code className="font-mono">035_commercials.sql</code> in the Supabase SQL editor.
        </div>
      ) : (
        <CommercialsAdmin
          initialTab={searchParams.tab === "inquiries" ? "inquiries" : "commercials"}
          commercials={(commercialsRes.data ?? []) as Commercial[]}
          inquiries={(inquiriesRes.data ?? []) as CommercialInquiry[]}
        />
      )}
    </div>
  );
}
