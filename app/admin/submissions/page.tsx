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
      <div>
        <h1 className="font-display text-2xl uppercase">Submissions</h1>
        <p className="mt-1 text-sm text-gray-400">
          Review creator project submissions. Nothing is published automatically.
        </p>
      </div>

      {!submissions?.length ? (
        <p className="text-sm text-gray-400">No submissions yet.</p>
      ) : (
        <SubmissionsDashboard submissions={submissions} />
      )}
    </div>
  );
}
