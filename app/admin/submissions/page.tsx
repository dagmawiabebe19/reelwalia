import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { SUBMISSION_STATUSES } from "@/lib/submissions/constants";
import { createAdminClient } from "@/lib/supabase/admin";

function statusClass(status: string): string {
  switch (status) {
    case "new":
      return "text-obsidian-red";
    case "reviewing":
      return "text-amber-400";
    case "contacted":
      return "text-sky-400";
    case "approved":
      return "text-emerald-400";
    case "rejected":
      return "text-zinc-500";
    default:
      return "text-zinc-400";
  }
}

function statusLabel(status: string): string {
  return SUBMISSION_STATUSES.find((s) => s.value === status)?.label ?? status;
}

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

  const { data: submissions } = await admin
    .from("creator_submissions")
    .select(
      "id, creator_name, project_title, genre, status, email, trailer_link, screener_link, created_at"
    )
    .order("created_at", { ascending: false });

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
        <>
          <div className="hidden overflow-hidden rounded-lg border border-white/[0.08] md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/[0.08] bg-white/[0.02] text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Creator</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Genre</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Status</th>
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
                        {item.creator_name}
                      </Link>
                      <p className="text-xs text-zinc-500">{item.email}</p>
                    </td>
                    <td className="px-4 py-3">{item.project_title}</td>
                    <td className="px-4 py-3 text-zinc-400">{item.genre}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {formatDate(item.created_at)}
                    </td>
                    <td className={`px-4 py-3 text-xs uppercase ${statusClass(item.status)}`}>
                      {statusLabel(item.status)}
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
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.project_title}</p>
                      <p className="text-sm text-zinc-400">{item.creator_name}</p>
                    </div>
                    <span
                      className={`shrink-0 text-xs uppercase ${statusClass(item.status)}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {item.genre} · {formatDate(item.created_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
