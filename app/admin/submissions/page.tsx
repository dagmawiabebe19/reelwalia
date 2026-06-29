import { AdminPageHeader } from "@/components/admin/admin-ui";
import { SubmissionsDashboard } from "@/components/admin/SubmissionsDashboard";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminSubmissionsPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: submissions } = await admin
    .from("creator_submissions")
    .select(
      "id, creator_name, project_title, project_type, project_stage, genre, custom_genre, logline, submission_status, contract_sent, contract_signed, content_delivered, launch_date, created_at"
    );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Submissions"
        subtitle="Review creator project submissions. Nothing is published automatically."
      />

      {!submissions?.length ? (
        <div className="rw-admin-panel">
          <p className="text-sm text-zinc-400">No submissions yet.</p>
        </div>
      ) : (
        <SubmissionsDashboard submissions={submissions} />
      )}
    </div>
  );
}
