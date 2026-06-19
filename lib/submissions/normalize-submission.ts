import type { CreatorSubmission, SubmissionStatusHistoryEntry } from "@/lib/types/database";
import type { DealTermsFields } from "@/lib/submissions/deal-terms";

export function parseNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value).replace(/[$,]/g, ""));
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function parseNullableScore(value: unknown): number | null {
  const parsed = parseNullableNumber(value);
  if (parsed == null) return null;
  const score = Math.trunc(parsed);
  if (score < 1 || score > 10) return null;
  return score;
}

export function scoreToInputValue(value: unknown): string {
  const score = parseNullableScore(value);
  return score == null ? "" : String(score);
}

export function formatSafeDateTime(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

export function normalizeDealTermsFields(raw: Partial<DealTermsFields> | null | undefined): DealTermsFields {
  return {
    distribution_type: raw?.distribution_type ?? null,
    revenue_share: raw?.revenue_share ?? null,
    license_fee: parseNullableNumber(raw?.license_fee),
    contract_sent: raw?.contract_sent === true,
    contract_signed: raw?.contract_signed === true,
    content_delivered: raw?.content_delivered === true,
    launch_date: raw?.launch_date ? String(raw.launch_date).slice(0, 10) : null,
  };
}

export function normalizeCreatorSubmissionForAdmin(
  raw: Record<string, unknown>
): CreatorSubmission {
  const submission = raw as unknown as CreatorSubmission;
  return {
    ...submission,
    concept_score: parseNullableScore(raw.concept_score),
    marketability_score: parseNullableScore(raw.marketability_score),
    production_quality_score: parseNullableScore(raw.production_quality_score),
    license_fee: parseNullableNumber(raw.license_fee),
    contract_sent: raw.contract_sent === true,
    contract_signed: raw.contract_signed === true,
    content_delivered: raw.content_delivered === true,
    launch_date: raw.launch_date ? String(raw.launch_date).slice(0, 10) : null,
    distribution_type: (raw.distribution_type as string | null) ?? null,
    revenue_share: (raw.revenue_share as string | null) ?? null,
    acquisition_notes: (raw.acquisition_notes as string | null) ?? null,
    custom_genre: (raw.custom_genre as string | null) ?? null,
    submission_status:
      (raw.submission_status as CreatorSubmission["submission_status"]) ?? "new_submission",
  };
}

export function normalizeStatusHistory(
  entries: SubmissionStatusHistoryEntry[] | null | undefined
): SubmissionStatusHistoryEntry[] {
  return (entries ?? []).filter(
    (entry): entry is SubmissionStatusHistoryEntry =>
    Boolean(entry?.id && entry?.status && entry?.created_at)
  );
}
