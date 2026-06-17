"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  ACQUISITION_SUBMISSION_STATUSES,
  type AcquisitionSubmissionStatus,
} from "@/lib/submissions/constants";
import { parseReviewScore } from "@/lib/submissions/project-stage";
import type { DealTermsFields } from "@/lib/submissions/deal-terms";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubmissionReviewScoresInput = {
  conceptScore: string;
  marketabilityScore: string;
  productionQualityScore: string;
};

export type SubmissionStatusHistoryEntry = {
  id: string;
  submission_id: string;
  status: string;
  created_at: string;
};

export async function updateSubmissionReviewScores(
  id: string,
  scores: SubmissionReviewScoresInput
) {
  await requireAdmin();

  const conceptScore = parseReviewScore(scores.conceptScore);
  const marketabilityScore = parseReviewScore(scores.marketabilityScore);
  const productionQualityScore = parseReviewScore(scores.productionQualityScore);

  if (scores.conceptScore.trim() && conceptScore === null) {
    throw new Error("Concept score must be between 1 and 10.");
  }
  if (scores.marketabilityScore.trim() && marketabilityScore === null) {
    throw new Error("Marketability score must be between 1 and 10.");
  }
  if (scores.productionQualityScore.trim() && productionQualityScore === null) {
    throw new Error("Production quality score must be between 1 and 10.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("creator_submissions")
    .update({
      concept_score: conceptScore,
      marketability_score: marketabilityScore,
      production_quality_score: productionQualityScore,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/submissions");
  revalidatePath(`/admin/submissions/${id}`);
}

export async function updateAcquisitionSubmissionStatus(
  id: string,
  submissionStatus: AcquisitionSubmissionStatus
) {
  await requireAdmin();

  if (!ACQUISITION_SUBMISSION_STATUSES.some((item) => item.value === submissionStatus)) {
    throw new Error("Invalid submission status");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("creator_submissions")
    .update({ submission_status: submissionStatus })
    .eq("id", id);

  if (error) throw new Error(error.message);

  const { data: historyEntry, error: historyError } = await admin
    .from("submission_status_history")
    .select("id, submission_id, status, created_at")
    .eq("submission_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (historyError) throw new Error(historyError.message);

  revalidatePath("/admin/submissions");
  revalidatePath(`/admin/submissions/${id}`);

  return {
    submissionStatus,
    historyEntry: historyEntry as SubmissionStatusHistoryEntry | null,
  };
}

export async function updateAcquisitionNotes(id: string, notes: string) {
  await requireAdmin();

  const admin = createAdminClient();
  const { error } = await admin
    .from("creator_submissions")
    .update({ acquisition_notes: notes.trim() || null })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/submissions/${id}`);

  return { acquisitionNotes: notes.trim() || null };
}

export async function updateDealTerms(id: string, dealTerms: DealTermsFields) {
  await requireAdmin();

  const admin = createAdminClient();
  const { error } = await admin
    .from("creator_submissions")
    .update({
      distribution_type: dealTerms.distribution_type,
      revenue_share: dealTerms.revenue_share,
      license_fee: dealTerms.license_fee,
      contract_sent: dealTerms.contract_sent,
      contract_signed: dealTerms.contract_signed,
      content_delivered: dealTerms.content_delivered,
      launch_date: dealTerms.launch_date,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/submissions");
  revalidatePath(`/admin/submissions/${id}`);

  return dealTerms;
}
