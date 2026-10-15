export const COMMERCIALS_BUCKET = "commercials";

export const COMMERCIAL_INQUIRY_NOTIFY_EMAIL = "dagmawiabebe19@gmail.com";

/** Public mailto fallback on /ads. */
export const COMMERCIAL_CONTACT_EMAIL = "info@waliastudios.media";

export const COMMERCIAL_ASPECT_RATIOS = ["9:16", "16:9", "1:1"] as const;
export type CommercialAspectRatio = (typeof COMMERCIAL_ASPECT_RATIOS)[number];

export const COMMERCIAL_CATEGORY_SUGGESTIONS = [
  "Product",
  "Brand",
  "Restaurant",
  "App",
  "Event",
] as const;

export const BUDGET_RANGES = [
  "Under $1,000",
  "$1,000–$3,000",
  "$3,000–$7,500",
  "$7,500+",
  "Not sure yet",
] as const;
export type BudgetRange = (typeof BUDGET_RANGES)[number];

export const TIMELINES = ["ASAP", "2–4 weeks", "1–2 months", "Flexible"] as const;
export type Timeline = (typeof TIMELINES)[number];

export const PLATFORMS = [
  "TikTok",
  "Instagram",
  "YouTube",
  "Facebook",
  "TV/Streaming",
  "Other",
] as const;
export type Platform = (typeof PLATFORMS)[number];

export const INQUIRY_STATUSES = ["new", "contacted", "quoted", "won", "lost"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
};

export interface Commercial {
  id: string;
  title: string;
  client_name: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  aspect_ratio: CommercialAspectRatio;
  duration_seconds: number | null;
  category: string | null;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
}

export const COMMERCIAL_PUBLIC_COLUMNS =
  "id, title, client_name, description, video_url, thumbnail_url, aspect_ratio, duration_seconds, category, is_featured, is_published, sort_order, created_at";

export interface CommercialInquiry {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  budget_range: BudgetRange | null;
  timeline: Timeline | null;
  platforms: Platform[];
  message: string;
  reference_commercial_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  status: InquiryStatus;
  created_at: string;
}

export function commercialClientLabel(c: Pick<Commercial, "client_name">): string {
  return c.client_name?.trim() || "ReelWalia Original";
}

/** Window event used by the player modal to pre-fill the inquiry form's reference. */
export const COMMERCIAL_REFERENCE_EVENT = "rw-commercial-reference";
export const COMMERCIAL_FORM_ANCHOR = "quote";
export const COMMERCIAL_GALLERY_ANCHOR = "work";

/** Form field bots fill; humans never see it. */
export const INQUIRY_HONEYPOT_FIELD = "website";
