"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { parseReviewScore } from "@/lib/submissions/project-stage";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUBMISSION_STATUSES, type SubmissionStatus } from "@/lib/submissions/constants";

export type SubmissionReviewScoresInput = {
  conceptScore: string;
  marketabilityScore: string;
  productionQualityScore: string;
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

export async function updateSubmissionStatus(id: string, status: SubmissionStatus) {
  await requireAdmin();

  if (!SUBMISSION_STATUSES.some((s) => s.value === status)) {
    throw new Error("Invalid status");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("creator_submissions")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/submissions");
  revalidatePath(`/admin/submissions/${id}`);
}
