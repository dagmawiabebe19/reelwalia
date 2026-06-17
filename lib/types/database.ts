export type SeriesStatus =
  | "draft"
  | "published"
  | "completed"
  | "coming_soon"
  | "in_development";
export type SubscriptionStatus =
  | "none"
  | "active"
  | "past_due"
  | "canceled"
  | "trialing";
export type SubscriptionPlan =
  | "free"
  | "monthly"
  | "yearly"
  | "1week"
  | "2week"
  | "1month";

export const SERIES_GENRES = [
  "Drama",
  "Romance",
  "Thriller",
  "Werewolf",
  "Revenge",
] as const;

export type SeriesGenre = (typeof SERIES_GENRES)[number];

export type SeriesOrientation = "vertical" | "landscape";

export interface Series {
  id: string;
  title: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  poster_url: string | null;
  banner_url: string | null;
  genre: string[];
  tags: string[];
  status: SeriesStatus;
  orientation: SeriesOrientation;
  total_episodes: number;
  free_episode_count: number;
  is_featured: boolean;
  featured_order: number | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface Episode {
  id: string;
  series_id: string;
  episode_number: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  bunny_video_id: string | null;
  subtitle_url: string | null;
  duration_seconds: number | null;
  is_free: boolean;
  view_count: number;
  display_view_count: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  stripe_customer_id: string | null;
  subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_plan: SubscriptionPlan;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface WatchHistory {
  id: string;
  user_id: string;
  series_id: string;
  episode_id: string;
  progress_seconds: number;
  completed: boolean;
  last_watched_at: string;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  series_id: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export type SeriesCard = Pick<
  Series,
  "id" | "title" | "slug" | "tagline" | "poster_url" | "banner_url" | "genre"
>;

export type EpisodeListItem = Pick<
  Episode,
  | "id"
  | "episode_number"
  | "title"
  | "thumbnail_url"
  | "duration_seconds"
  | "is_free"
  | "display_view_count"
  | "view_count"
>;

export type SubmissionStatus =
  | "new"
  | "reviewing"
  | "contacted"
  | "approved"
  | "rejected";

export type ProductionStatus =
  | "released"
  | "completed"
  | "in_post_production"
  | "in_production"
  | "development";

export type ProjectStage =
  | "idea_concept"
  | "script_complete"
  | "in_production"
  | "post_production"
  | "completed_ready";

export interface CreatorSubmission {
  id: string;
  creator_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  country: string | null;
  instagram: string | null;
  website: string | null;
  imdb: string | null;
  project_title: string;
  project_type: string;
  genre: string;
  logline: string;
  description: string;
  episode_count: number;
  average_episode_length: string;
  runtime_minutes: number | null;
  production_status: ProductionStatus;
  project_stage: ProjectStage;
  target_audience: string | null;
  trailer_available: boolean | null;
  submission_rights_confirmed: boolean;
  concept_score: number | null;
  marketability_score: number | null;
  production_quality_score: number | null;
  trailer_link: string | null;
  screener_link: string | null;
  youtube_link: string | null;
  vimeo_link: string | null;
  google_drive_link: string | null;
  dropbox_link: string | null;
  project_website_link: string | null;
  poster_link: string | null;
  hero_banner_link: string | null;
  owns_distribution_rights: boolean;
  released_elsewhere: boolean;
  released_elsewhere_where: string | null;
  additional_notes: string | null;
  status: SubmissionStatus;
  created_at: string;
  updated_at: string;
}
