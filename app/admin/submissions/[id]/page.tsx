import { notFound } from "next/navigation";
import { SubmissionDetail } from "@/components/admin/SubmissionDetail";
import { requireAdmin } from "@/lib/admin";
import {
  normalizeCreatorSubmissionForAdmin,
  normalizeStatusHistory,
} from "@/lib/submissions/normalize-submission";
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

  const { data: statusHistory } = await admin
    .from("submission_status_history")
    .select("id, submission_id, status, created_at")
    .eq("submission_id", params.id)
    .order("created_at", { ascending: true });

  return (
    <SubmissionDetail
      submission={normalizeCreatorSubmissionForAdmin(submission)}
      statusHistory={normalizeStatusHistory(statusHistory)}
    />
  );
}
