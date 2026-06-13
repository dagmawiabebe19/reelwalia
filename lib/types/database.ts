export type SeriesStatus = "draft" | "published" | "completed";
export type SubscriptionStatus =
  | "none"
  | "active"
  | "past_due"
  | "canceled"
  | "trialing";
export type SubscriptionPlan = "free" | "monthly" | "yearly";

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

/** Placeholder cards used when the catalog is empty (Phase 0). */
export const PLACEHOLDER_SERIES: Pick<
  Series,
  "id" | "title" | "slug" | "tagline" | "poster_url" | "banner_url" | "genre"
>[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    title: "Crown of Ashes",
    slug: "crown-of-ashes",
    tagline: "Power has a price.",
    poster_url: null,
    banner_url: null,
    genre: ["Drama", "Romance"],
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    title: "Midnight Contract",
    slug: "midnight-contract",
    tagline: "One deal changes everything.",
    poster_url: null,
    banner_url: null,
    genre: ["Thriller"],
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    title: "Echoes of Addis",
    slug: "echoes-of-addis",
    tagline: "Home is never far.",
    poster_url: null,
    banner_url: null,
    genre: ["Drama"],
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    title: "The Last Heir",
    slug: "the-last-heir",
    tagline: "Legacy or ruin.",
    poster_url: null,
    banner_url: null,
    genre: ["Drama", "Mystery"],
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    title: "Burning Bridges",
    slug: "burning-bridges",
    tagline: "Love in the crossfire.",
    poster_url: null,
    banner_url: null,
    genre: ["Romance"],
  },
  {
    id: "00000000-0000-0000-0000-000000000006",
    title: "Silent Witness",
    slug: "silent-witness",
    tagline: "She saw too much.",
    poster_url: null,
    banner_url: null,
    genre: ["Thriller", "Mystery"],
  },
];
