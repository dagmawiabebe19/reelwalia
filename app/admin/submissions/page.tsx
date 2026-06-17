import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import {
  compareSubmissionsByAcquisitionPriority,
  getProjectStageBadgeClass,
  getProjectStageLabel,
} from "@/lib/submissions/project-stage";
import { createAdminClient } from "@/lib/supabase/admin";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminSubmissionsPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("creator_submissions")
    .select("id, creator_name, project_title, project_type, project_stage, created_at");

  const submissions = [...(rows ?? [])].sort(compareSubmissionsByAcquisitionPriority);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase">Submissions</h1>
        <p className="mt-1 text-sm text-gray-400">
          Review creator project submissions. Nothing is published automatically.
        </p>
      </div>

      {!submissions.length ? (
        <p className="text-sm text-gray-400">No submissions yet.</p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-white/[0.08] md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/[0.08] bg-white/[0.02] text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Project Type</th>
                  <th className="px-4 py-3 font-medium">Project Stage</th>
                  <th className="px-4 py-3 font-medium">Creator Name</th>
                  <th className="px-4 py-3 font-medium">Submission Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {submissions.map((item) => (
                  <tr key={item.id} className="transition hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/submissions/${item.id}`}
                        className="font-medium hover:text-obsidian-red"
                      >
                        {item.project_title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{item.project_type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium uppercase ${getProjectStageBadgeClass(item.project_stage)}`}
                      >
                        {getProjectStageLabel(item.project_stage)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.creator_name}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {formatDate(item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-white/[0.08] rounded-lg border border-white/[0.08] md:hidden">
            {submissions.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/submissions/${item.id}`}
                  className="block space-y-2 px-4 py-4 transition hover:bg-white/[0.03]"
                >
                  <p className="font-medium">{item.project_title}</p>
                  <p className="text-sm text-zinc-400">{item.creator_name}</p>
                  <p className="text-xs text-zinc-500">
                    {item.project_type} · {formatDate(item.created_at)}
                  </p>
                  <span
                    className={`inline-block text-xs font-medium uppercase ${getProjectStageBadgeClass(item.project_stage)}`}
                  >
                    {getProjectStageLabel(item.project_stage)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
