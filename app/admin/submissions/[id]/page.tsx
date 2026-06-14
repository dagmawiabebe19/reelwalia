import { notFound } from "next/navigation";
import { SubmissionDetail } from "@/components/admin/SubmissionDetail";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminSubmissionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: submission } = await admin
    .from("creator_submissions")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!submission) notFound();

  return <SubmissionDetail submission={submission} />;
}
