export const SUBMISSION_GENRES = [
  "Drama",
  "Romance",
  "Thriller",
  "Comedy",
  "Action",
  "Documentary",
  "Horror",
  "Other",
] as const;

export type SubmissionGenre = (typeof SUBMISSION_GENRES)[number];

export const PROJECT_TYPES = [
  "Feature Film",
  "Episodic Series",
  "Short Film",
  "AI Episodic Series",
  "AI Feature Film",
  "AI Short Film",
  "AI Vertical Series",
  "Vertical Drama Series",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PRODUCTION_STATUSES = [
  { value: "released", label: "Released" },
  { value: "completed", label: "Completed" },
  { value: "in_post_production", label: "In Post-Production" },
  { value: "in_production", label: "In Production" },
  { value: "development", label: "Development" },
] as const;

export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number]["value"];

export const PROJECT_STAGES = [
  {
    value: "completed_ready",
    label: "Completed / Ready to Release",
    sortOrder: 1,
    badgeClass: "text-emerald-400",
  },
  {
    value: "post_production",
    label: "Post Production",
    sortOrder: 2,
    badgeClass: "text-sky-400",
  },
  {
    value: "in_production",
    label: "In Production",
    sortOrder: 3,
    badgeClass: "text-orange-400",
  },
  {
    value: "script_complete",
    label: "Script Complete",
    sortOrder: 4,
    badgeClass: "text-purple-400",
  },
  {
    value: "idea_concept",
    label: "Idea / Concept",
    sortOrder: 5,
    badgeClass: "text-zinc-400",
  },
] as const;

export type ProjectStage = (typeof PROJECT_STAGES)[number]["value"];

export const ACQUISITION_SUBMISSION_STATUSES = [
  {
    value: "interested",
    label: "Interested",
    sortOrder: 1,
    badgeClass: "text-purple-400",
  },
  {
    value: "negotiating",
    label: "Negotiating",
    sortOrder: 2,
    badgeClass: "text-yellow-400",
  },
  {
    value: "request_materials",
    label: "Request Materials",
    sortOrder: 3,
    badgeClass: "text-orange-400",
  },
  {
    value: "under_review",
    label: "Under Review",
    sortOrder: 4,
    badgeClass: "text-sky-400",
  },
  {
    value: "new_submission",
    label: "New Submission",
    sortOrder: 5,
    badgeClass: "text-zinc-400",
  },
  {
    value: "accepted",
    label: "Accepted",
    sortOrder: 6,
    badgeClass: "text-emerald-400",
  },
  {
    value: "rejected",
    label: "Rejected",
    sortOrder: 7,
    badgeClass: "text-red-400",
  },
] as const;

export type AcquisitionSubmissionStatus =
  (typeof ACQUISITION_SUBMISSION_STATUSES)[number]["value"];

export const DISTRIBUTION_TYPES = [
  { value: "non_exclusive", label: "Non-Exclusive" },
  { value: "exclusive", label: "Exclusive" },
  { value: "reelwalia_original", label: "ReelWalia Original" },
] as const;

export type DistributionType = (typeof DISTRIBUTION_TYPES)[number]["value"];

export const REVENUE_SHARE_PRESETS = ["60/40", "50/50"] as const;

export type RevenueSharePreset = (typeof REVENUE_SHARE_PRESETS)[number] | "custom";

export const SUBMISSION_STATUSES = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "contacted", label: "Contacted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]["value"];

export const SUBMISSION_NOTIFY_EMAIL =
  process.env.SUBMISSION_NOTIFY_EMAIL ?? "info@waliastudios.media";
