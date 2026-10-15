"use client";

import { Fragment, useState, useTransition } from "react";
import { updateInquiryStatus } from "@/app/admin/commercials/actions";
import {
  INQUIRY_STATUSES,
  INQUIRY_STATUS_LABELS,
  type Commercial,
  type CommercialInquiry,
  type InquiryStatus,
} from "@/lib/commercials/constants";

const STATUS_STYLE: Record<InquiryStatus, string> = {
  new: "border-obsidian-red/40 text-obsidian-red",
  contacted: "border-sky-500/40 text-sky-400",
  quoted: "border-amber-500/40 text-amber-400",
  won: "border-emerald-500/40 text-emerald-400",
  lost: "border-white/15 text-zinc-500",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusSelect({ inquiry }: { inquiry: CommercialInquiry }) {
  const [status, setStatus] = useState<InquiryStatus>(inquiry.status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  return (
    <select
      value={status}
      disabled={pending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const next = e.target.value as InquiryStatus;
        const prev = status;
        setStatus(next);
        setError(false);
        startTransition(async () => {
          try {
            await updateInquiryStatus(inquiry.id, next);
          } catch {
            setStatus(prev);
            setError(true);
          }
        });
      }}
      className={`rounded-md border bg-black px-2 py-1 text-xs font-semibold ${STATUS_STYLE[status]} ${error ? "ring-1 ring-red-500" : ""} disabled:opacity-60`}
      aria-label={`Status for ${inquiry.name}`}
      title={error ? "Could not save, try again" : undefined}
    >
      {INQUIRY_STATUSES.map((s) => (
        <option key={s} value={s}>
          {INQUIRY_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

export function CommercialInquiriesTable({
  inquiries,
  commercials,
}: {
  inquiries: CommercialInquiry[];
  commercials: Commercial[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const titleById = new Map(commercials.map((c) => [c.id, c.title]));

  if (inquiries.length === 0) {
    return (
      <div className="rw-admin-panel text-center text-sm text-zinc-500">
        No inquiries yet. Leads from the /ads form will appear here.
      </div>
    );
  }

  return (
    <div className="rw-admin-table-wrap overflow-x-auto">
      <table className="rw-admin-table min-w-[960px]">
        <thead>
          <tr>
            <th>Received</th>
            <th>Name</th>
            <th>Company</th>
            <th>Budget</th>
            <th>Timeline</th>
            <th>Platforms</th>
            <th>Reference</th>
            <th>UTM source</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {inquiries.map((inq) => {
            const open = expanded === inq.id;
            return (
              <Fragment key={inq.id}>
                <tr
                  className="cursor-pointer"
                  onClick={() => setExpanded(open ? null : inq.id)}
                  aria-expanded={open}
                >
                  <td className="whitespace-nowrap text-xs text-zinc-500">{formatDate(inq.created_at)}</td>
                  <td>
                    <p className="font-semibold text-white">{inq.name}</p>
                    <p className="text-xs text-zinc-500">{inq.email}</p>
                  </td>
                  <td className="text-zinc-300">{inq.company ?? "—"}</td>
                  <td className="whitespace-nowrap text-zinc-300">{inq.budget_range ?? "—"}</td>
                  <td className="whitespace-nowrap text-zinc-300">{inq.timeline ?? "—"}</td>
                  <td className="text-xs text-zinc-400">{inq.platforms?.length ? inq.platforms.join(", ") : "—"}</td>
                  <td className="max-w-[10rem] truncate text-xs text-zinc-400">
                    {inq.reference_commercial_id ? titleById.get(inq.reference_commercial_id) ?? "Deleted" : "—"}
                  </td>
                  <td className="text-xs text-zinc-400">{inq.utm_source ?? "—"}</td>
                  <td>
                    <StatusSelect inquiry={inq} />
                  </td>
                </tr>
                {open && (
                  <tr className="bg-white/[0.02] hover:bg-white/[0.02]">
                    <td colSpan={9} className="px-4 py-5">
                      <div className="grid gap-4 text-sm md:grid-cols-[2fr_1fr]">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Message</p>
                          <p className="mt-2 whitespace-pre-wrap leading-relaxed text-zinc-200">{inq.message}</p>
                        </div>
                        <dl className="space-y-1.5 text-xs text-zinc-400">
                          <div>
                            <dt className="inline text-zinc-500">Email: </dt>
                            <dd className="inline">
                              <a href={`mailto:${inq.email}`} className="text-white underline">
                                {inq.email}
                              </a>
                            </dd>
                          </div>
                          {inq.phone && (
                            <div>
                              <dt className="inline text-zinc-500">Phone: </dt>
                              <dd className="inline text-white">{inq.phone}</dd>
                            </div>
                          )}
                          <div>
                            <dt className="inline text-zinc-500">UTM: </dt>
                            <dd className="inline">
                              {[inq.utm_source, inq.utm_medium, inq.utm_campaign].filter(Boolean).join(" / ") || "—"}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
