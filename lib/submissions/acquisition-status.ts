import { ACQUISITION_SUBMISSION_STATUSES, PROJECT_STAGES } from "@/lib/submissions/constants";

export function getAcquisitionStatusLabel(status: string): string {
  return (
    ACQUISITION_SUBMISSION_STATUSES.find((item) => item.value === status)?.label ??
    status
  );
}

export function getAcquisitionStatusSortOrder(status: string): number {
  return (
    ACQUISITION_SUBMISSION_STATUSES.find((item) => item.value === status)?.sortOrder ??
    99
  );
}

export function getAcquisitionStatusBadgeClass(status: string): string {
  return (
    ACQUISITION_SUBMISSION_STATUSES.find((item) => item.value === status)?.badgeClass ??
    "text-zinc-400"
  );
}

function getProjectStageSortOrder(stage: string): number {
  return PROJECT_STAGES.find((item) => item.value === stage)?.sortOrder ?? 99;
}

export function compareSubmissionsByAcquisitionPriority<
  T extends { submission_status: string; project_stage: string; created_at: string }
>(a: T, b: T): number {
  const statusDiff =
    getAcquisitionStatusSortOrder(a.submission_status) -
    getAcquisitionStatusSortOrder(b.submission_status);
  if (statusDiff !== 0) return statusDiff;

  const stageDiff =
    getProjectStageSortOrder(a.project_stage) - getProjectStageSortOrder(b.project_stage);
  if (stageDiff !== 0) return stageDiff;

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export function buildContactCreatorMailto(input: {
  email: string;
  creatorName: string;
  projectTitle: string;
}): string {
  const subject = `ReelWalia Submission - ${input.projectTitle}`;
  const body = `Hello ${input.creatorName},

Thank you for submitting "${input.projectTitle}" to ReelWalia.

We reviewed your submission and would like to discuss it further.

Best,
ReelWalia Acquisitions`;

  const params = new URLSearchParams({
    subject,
    body,
  });

  return `mailto:${input.email}?${params.toString()}`;
}

export function formatActivityHistoryDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}
