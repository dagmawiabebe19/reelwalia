"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateSubmissionStatus } from "@/app/admin/submissions/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  PRODUCTION_STATUSES,
  SUBMISSION_STATUSES,
  type SubmissionStatus,
} from "@/lib/submissions/constants";
import type { CreatorSubmission } from "@/lib/types/database";

function DetailRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null | undefined;
  href?: string | null;
}) {
  if (!value) return null;

  return (
    <div className="grid gap-1 border-b border-white/[0.06] py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-200">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-obsidian-red hover:underline"
          >
            {value}
          </a>
        ) : (
          <span className="break-words">{value}</span>
        )}
      </dd>
    </div>
  );
}

function productionLabel(status: string): string {
  return (
    PRODUCTION_STATUSES.find((item) => item.value === status)?.label ?? status
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function SubmissionDetail({ submission }: { submission: CreatorSubmission }) {
  const router = useRouter();
  const [status, setStatus] = useState<SubmissionStatus>(submission.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const saveStatus = () => {
    setError(null);
    startTransition(async () => {
      try {
        await updateSubmissionStatus(submission.id, status);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/submissions"
            className="text-sm text-gray-400 hover:text-white"
          >
            ← Back to submissions
          </Link>
          <h1 className="mt-2 font-display text-2xl uppercase">
            {submission.project_title}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Submitted {formatDate(submission.created_at)}
          </p>
        </div>

        <div className="flex min-w-[14rem] flex-col gap-2">
          <label className="text-xs uppercase tracking-wide text-zinc-500">
            Status
          </label>
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubmissionStatus)}
              className="rw-form-select flex-1 py-2 text-sm"
            >
              {SUBMISSION_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={saveStatus}
              disabled={pending || status === submission.status}
              className="rw-btn-primary min-h-10 px-4 py-2 text-sm"
            >
              {pending ? <LoadingSpinner className="h-4 w-4" label="Saving" /> : "Save"}
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>

      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
        <h2 className="font-display text-lg uppercase">Contact</h2>
        <dl className="mt-3">
          <DetailRow label="Creator" value={submission.creator_name} />
          <DetailRow label="Email" value={submission.email} href={`mailto:${submission.email}`} />
          <DetailRow label="Phone" value={submission.phone} href={submission.phone ? `tel:${submission.phone}` : null} />
          <DetailRow label="Company" value={submission.company} />
          <DetailRow label="Country" value={submission.country} />
          <DetailRow label="Instagram" value={submission.instagram} />
          <DetailRow label="Website" value={submission.website} href={submission.website} />
          <DetailRow label="IMDb" value={submission.imdb} href={submission.imdb} />
        </dl>
      </div>

      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
        <h2 className="font-display text-lg uppercase">Project</h2>
        <dl className="mt-3">
          <DetailRow label="Genre" value={submission.genre} />
          <DetailRow label="Production" value={productionLabel(submission.production_status)} />
          <DetailRow label="Episodes" value={String(submission.episode_count)} />
          <DetailRow label="Avg. Length" value={submission.average_episode_length} />
          {submission.runtime_minutes != null && (
            <DetailRow
              label="Runtime"
              value={`${submission.runtime_minutes} minutes`}
            />
          )}
          <DetailRow label="Logline" value={submission.logline} />
        </dl>
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Description</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {submission.description}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
        <h2 className="font-display text-lg uppercase">Media & Artwork</h2>
        <dl className="mt-3">
          <DetailRow label="Trailer" value={submission.trailer_link} href={submission.trailer_link} />
          <DetailRow label="Screener" value={submission.screener_link} href={submission.screener_link} />
          <DetailRow label="YouTube" value={submission.youtube_link} href={submission.youtube_link} />
          <DetailRow label="Vimeo" value={submission.vimeo_link} href={submission.vimeo_link} />
          <DetailRow label="Google Drive" value={submission.google_drive_link} href={submission.google_drive_link} />
          <DetailRow label="Dropbox" value={submission.dropbox_link} href={submission.dropbox_link} />
          <DetailRow label="Project Site" value={submission.project_website_link} href={submission.project_website_link} />
          <DetailRow label="Poster" value={submission.poster_link} href={submission.poster_link} />
          <DetailRow label="Hero Banner" value={submission.hero_banner_link} href={submission.hero_banner_link} />
        </dl>
      </div>

      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
        <h2 className="font-display text-lg uppercase">Rights</h2>
        <dl className="mt-3">
          <DetailRow
            label="Owns Rights"
            value={submission.owns_distribution_rights ? "Yes" : "No"}
          />
          <DetailRow
            label="Released Elsewhere"
            value={submission.released_elsewhere ? "Yes" : "No"}
          />
          <DetailRow label="Released Where" value={submission.released_elsewhere_where} />
        </dl>
      </div>

      {submission.additional_notes && (
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
          <h2 className="font-display text-lg uppercase">Additional Notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {submission.additional_notes}
          </p>
        </div>
      )}
    </div>
  );
}
