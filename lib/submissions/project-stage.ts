import { PROJECT_STAGES, type ProjectStage } from "@/lib/submissions/constants";

export function getProjectStageLabel(stage: string): string {
  return PROJECT_STAGES.find((item) => item.value === stage)?.label ?? stage;
}

export function getProjectStageSortOrder(stage: string): number {
  return PROJECT_STAGES.find((item) => item.value === stage)?.sortOrder ?? 99;
}

export function getProjectStageBadgeClass(stage: string): string {
  return PROJECT_STAGES.find((item) => item.value === stage)?.badgeClass ?? "text-zinc-400";
}

export function calculateOverallReviewScore(
  concept: number | null | undefined,
  marketability: number | null | undefined,
  productionQuality: number | null | undefined
): number | null {
  const scores = [concept, marketability, productionQuality].filter(
    (score): score is number => typeof score === "number" && Number.isFinite(score)
  );
  if (scores.length === 0) return null;
  const total = scores.reduce((sum, score) => sum + score, 0);
  return Math.round((total / scores.length) * 10) / 10;
}

export function isValidProjectStage(stage: string): stage is ProjectStage {
  return PROJECT_STAGES.some((item) => item.value === stage);
}

export function parseReviewScore(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const score = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(score) || score < 1 || score > 10) return null;
  return score;
}
