export type SeriesStatus = "draft" | "published" | "completed";
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
  "id" | "episode_number" | "title" | "thumbnail_url" | "duration_seconds" | "is_free"
>;
