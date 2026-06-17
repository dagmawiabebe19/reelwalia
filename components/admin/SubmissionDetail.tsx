"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  updateAcquisitionNotes,
  updateAcquisitionSubmissionStatus,
  updateSubmissionReviewScores,
} from "@/app/admin/submissions/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  ACQUISITION_SUBMISSION_STATUSES,
  PRODUCTION_STATUSES,
  type AcquisitionSubmissionStatus,
} from "@/lib/submissions/constants";
import {
  buildContactCreatorMailto,
  formatActivityHistoryDate,
  getAcquisitionStatusBadgeClass,
  getAcquisitionStatusLabel,
} from "@/lib/submissions/acquisition-status";
import { DealTermsPanel } from "@/components/admin/DealTermsPanel";
import { isDealTrackingStatus } from "@/lib/submissions/deal-terms";
import { formatSubmissionGenreDisplay } from "@/lib/submissions/genre";
import {
  calculateOverallReviewScore,
  getProjectStageLabel,
} from "@/lib/submissions/project-stage";
import type {
  CreatorSubmission,
  SubmissionStatusHistoryEntry,
} from "@/lib/types/database";

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

export function SubmissionDetail({
  submission,
  statusHistory,
}: {
  submission: CreatorSubmission;
  statusHistory: SubmissionStatusHistoryEntry[];
}) {
  const router = useRouter();
  const [submissionStatus, setSubmissionStatus] = useState<AcquisitionSubmissionStatus>(
    submission.submission_status ?? "new_submission"
  );
  const [activityHistory, setActivityHistory] = useState(statusHistory);
  const [acquisitionNotes, setAcquisitionNotes] = useState(
    submission.acquisition_notes ?? ""
  );
  const [conceptScore, setConceptScore] = useState(
    submission.concept_score?.toString() ?? ""
  );
  const [marketabilityScore, setMarketabilityScore] = useState(
    submission.marketability_score?.toString() ?? ""
  );
  const [productionQualityScore, setProductionQualityScore] = useState(
    submission.production_quality_score?.toString() ?? ""
  );
  const [statusError, setStatusError] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [notesPending, startNotesTransition] = useTransition();
  const [reviewPending, startReviewTransition] = useTransition();

  const contactMailto = useMemo(
    () =>
      buildContactCreatorMailto({
        email: submission.email,
        creatorName: submission.creator_name,
        projectTitle: submission.project_title,
      }),
    [submission.creator_name, submission.email, submission.project_title]
  );

  const showDealTerms = isDealTrackingStatus(submissionStatus);

  const overallScore = useMemo(
    () =>
      calculateOverallReviewScore(
        conceptScore.trim() ? Number.parseInt(conceptScore, 10) : null,
        marketabilityScore.trim() ? Number.parseInt(marketabilityScore, 10) : null,
        productionQualityScore.trim()
          ? Number.parseInt(productionQualityScore, 10)
          : null
      ),
    [conceptScore, marketabilityScore, productionQualityScore]
  );

  const savedReviewScores = useMemo(
    () =>
      calculateOverallReviewScore(
        submission.concept_score,
        submission.marketability_score,
        submission.production_quality_score
      ),
    [submission]
  );

  const reviewDirty =
    conceptScore !== (submission.concept_score?.toString() ?? "") ||
    marketabilityScore !== (submission.marketability_score?.toString() ?? "") ||
    productionQualityScore !== (submission.production_quality_score?.toString() ?? "");

  const notesDirty = acquisitionNotes !== (submission.acquisition_notes ?? "");

  const handleStatusChange = async (value: AcquisitionSubmissionStatus) => {
    if (value === submissionStatus || statusSaving) return;

    const previousStatus = submissionStatus;
    setSubmissionStatus(value);
    setStatusError(null);
    setStatusSaving(true);

    try {
      const result = await updateAcquisitionSubmissionStatus(submission.id, value);
      if (result.historyEntry) {
        setActivityHistory((prev) => {
          if (prev.some((entry) => entry.id === result.historyEntry!.id)) {
            return prev;
          }
          return [...prev, result.historyEntry!].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
      }
    } catch (err) {
      setSubmissionStatus(previousStatus);
      setStatusError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setStatusSaving(false);
    }
  };

  const saveAcquisitionNotes = () => {
    setNotesError(null);
    startNotesTransition(async () => {
      try {
        await updateAcquisitionNotes(submission.id, acquisitionNotes);
        router.refresh();
      } catch (err) {
        setNotesError(err instanceof Error ? err.message : "Update failed");
      }
    });
  };

  const saveReviewScores = () => {
    setReviewError(null);
    startReviewTransition(async () => {
      try {
        await updateSubmissionReviewScores(submission.id, {
          conceptScore,
          marketabilityScore,
          productionQualityScore,
        });
        router.refresh();
      } catch (err) {
        setReviewError(err instanceof Error ? err.message : "Update failed");
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

        <div className="flex min-w-[14rem] flex-col gap-3">
          <label className="text-xs uppercase tracking-wide text-zinc-500">
            Submission Status
          </label>
          <div className="relative">
            <select
              value={submissionStatus}
              onChange={(e) =>
                handleStatusChange(e.target.value as AcquisitionSubmissionStatus)
              }
              disabled={statusSaving}
              className="rw-form-select w-full py-2 text-sm"
            >
              {ACQUISITION_SUBMISSION_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {statusSaving && (
              <span className="absolute right-10 top-1/2 -translate-y-1/2">
                <LoadingSpinner className="h-4 w-4" label="Saving status" />
              </span>
            )}
          </div>
          <span
            className={`text-xs font-medium uppercase ${getAcquisitionStatusBadgeClass(submissionStatus)}`}
          >
            {getAcquisitionStatusLabel(submissionStatus)}
          </span>
          {statusError && <p className="text-xs text-red-400">{statusError}</p>}
          <a
            href={contactMailto}
            className="rw-btn-primary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm"
          >
            Contact Creator
          </a>
        </div>
      </div>

      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
        <h2 className="font-display text-lg uppercase">Activity History</h2>
        <p className="mt-1 text-xs text-zinc-500">Admin only. Status changes over time.</p>
        {activityHistory.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No activity recorded yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {activityHistory.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-white/[0.06] pb-3 last:border-b-0 last:pb-0"
              >
                <span className="text-sm text-zinc-400">
                  {formatActivityHistoryDate(entry.created_at)}
                </span>
                <span
                  className={`text-sm font-medium uppercase ${getAcquisitionStatusBadgeClass(entry.status)}`}
                >
                  {getAcquisitionStatusLabel(entry.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showDealTerms && (
        <DealTermsPanel
          submissionId={submission.id}
          initialDealTerms={{
            distribution_type: submission.distribution_type,
            revenue_share: submission.revenue_share,
            license_fee: submission.license_fee,
            contract_sent: submission.contract_sent ?? false,
            contract_signed: submission.contract_signed ?? false,
            content_delivered: submission.content_delivered ?? false,
            launch_date: submission.launch_date,
          }}
        />
      )}

      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
        <h2 className="font-display text-lg uppercase">Acquisition Notes</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Admin only. Internal notes for acquisitions review.
        </p>
        <textarea
          value={acquisitionNotes}
          onChange={(e) => setAcquisitionNotes(e.target.value)}
          className="rw-form-textarea mt-4"
          rows={6}
          placeholder={'Great concept but weak trailer.\nFollow up after festival run.'}
        />
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={saveAcquisitionNotes}
            disabled={notesPending || !notesDirty}
            className="rw-btn-primary min-h-10 px-4 py-2 text-sm"
          >
            {notesPending ? (
              <LoadingSpinner className="h-4 w-4" label="Saving notes" />
            ) : (
              "Save Notes"
            )}
          </button>
          {notesError && <p className="text-xs text-red-400">{notesError}</p>}
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
          <DetailRow label="Project Type" value={submission.project_type} />
          <DetailRow
            label="Genre"
            value={formatSubmissionGenreDisplay(submission.genre, submission.custom_genre)}
          />
          <DetailRow
            label="Project Stage"
            value={getProjectStageLabel(submission.project_stage)}
          />
          <DetailRow label="Production" value={productionLabel(submission.production_status)} />
          <DetailRow label="Target Audience" value={submission.target_audience} />
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
          <DetailRow
            label="Trailer Available"
            value={
              submission.trailer_available == null
                ? null
                : submission.trailer_available
                  ? "Yes"
                  : "No"
            }
          />
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
          <DetailRow
            label="Submission Rights"
            value={submission.submission_rights_confirmed ? "Confirmed" : "Not confirmed"}
          />
        </dl>
      </div>

      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
        <h2 className="font-display text-lg uppercase">Internal Review</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Admin only. Scores are never visible to creators.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Concept Score (1–10)
            </span>
            <input
              type="number"
              min={1}
              max={10}
              step={1}
              value={conceptScore}
              onChange={(e) => setConceptScore(e.target.value)}
              className="rw-form-input py-2 text-sm"
              placeholder="—"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Marketability Score (1–10)
            </span>
            <input
              type="number"
              min={1}
              max={10}
              step={1}
              value={marketabilityScore}
              onChange={(e) => setMarketabilityScore(e.target.value)}
              className="rw-form-input py-2 text-sm"
              placeholder="—"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Production Quality Score (1–10)
            </span>
            <input
              type="number"
              min={1}
              max={10}
              step={1}
              value={productionQualityScore}
              onChange={(e) => setProductionQualityScore(e.target.value)}
              className="rw-form-input py-2 text-sm"
              placeholder="—"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Overall Score</p>
            <p className="mt-1 text-lg font-medium text-zinc-200">
              {overallScore != null ? overallScore.toFixed(1) : "—"}
            </p>
            {!reviewDirty && savedReviewScores != null && (
              <p className="text-xs text-zinc-500">Saved</p>
            )}
          </div>
          <button
            type="button"
            onClick={saveReviewScores}
            disabled={reviewPending || !reviewDirty}
            className="rw-btn-primary min-h-10 px-4 py-2 text-sm"
          >
            {reviewPending ? (
              <LoadingSpinner className="h-4 w-4" label="Saving scores" />
            ) : (
              "Save Scores"
            )}
          </button>
        </div>
        {reviewError && <p className="mt-2 text-xs text-red-400">{reviewError}</p>}
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
