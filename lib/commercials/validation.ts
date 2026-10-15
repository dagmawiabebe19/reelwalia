import {
  BUDGET_RANGES,
  PLATFORMS,
  TIMELINES,
  type BudgetRange,
  type Platform,
  type Timeline,
} from "@/lib/commercials/constants";

export interface CommercialInquiryInput {
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
}

export type InquiryFieldErrors = Partial<Record<keyof CommercialInquiryInput, string>>;

export type InquiryValidationResult =
  | { ok: true; value: CommercialInquiryInput }
  | { ok: false; errors: InquiryFieldErrors };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE_RE = /^[+()\-.\s\d]{6,30}$/;

export const INQUIRY_LIMITS = {
  name: 120,
  email: 254,
  company: 160,
  phone: 30,
  message: 5000,
  messageMin: 10,
  utm: 200,
} as const;

function str(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function oneOf<T extends string>(value: unknown, options: readonly T[]): T | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

/** Shared by the form (client) and the API route (server). Unknown keys are ignored. */
export function validateCommercialInquiry(raw: unknown): InquiryValidationResult {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: InquiryFieldErrors = {};

  const name = str(input.name, INQUIRY_LIMITS.name);
  if (!name) errors.name = "Please enter your name.";

  const email = str(input.email, INQUIRY_LIMITS.email)?.toLowerCase() ?? null;
  if (!email) errors.email = "Please enter your email.";
  else if (!EMAIL_RE.test(email)) errors.email = "Please enter a valid email.";

  const phone = str(input.phone, INQUIRY_LIMITS.phone);
  if (phone && !PHONE_RE.test(phone)) errors.phone = "Please enter a valid phone number.";

  const budget = oneOf(input.budget_range, BUDGET_RANGES);
  if (budget === undefined) errors.budget_range = "Please pick a budget range.";

  const timeline = oneOf(input.timeline, TIMELINES);
  if (timeline === undefined) errors.timeline = "Please pick a timeline.";

  let platforms: Platform[] = [];
  if (input.platforms !== undefined && input.platforms !== null) {
    if (
      !Array.isArray(input.platforms) ||
      !input.platforms.every((p) => (PLATFORMS as readonly unknown[]).includes(p))
    ) {
      errors.platforms = "Please pick platforms from the list.";
    } else {
      platforms = Array.from(new Set(input.platforms as Platform[]));
    }
  }

  const message = str(input.message, INQUIRY_LIMITS.message);
  if (!message) errors.message = "Tell us a little about what you need.";
  else if (message.length < INQUIRY_LIMITS.messageMin)
    errors.message = "A few more details, please.";

  const reference = str(input.reference_commercial_id, 36);
  if (reference && !UUID_RE.test(reference)) {
    errors.reference_commercial_id = "Invalid reference.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name: name!,
      email: email!,
      company: str(input.company, INQUIRY_LIMITS.company),
      phone,
      budget_range: budget ?? null,
      timeline: timeline ?? null,
      platforms,
      message: message!,
      reference_commercial_id: reference,
      utm_source: str(input.utm_source, INQUIRY_LIMITS.utm),
      utm_medium: str(input.utm_medium, INQUIRY_LIMITS.utm),
      utm_campaign: str(input.utm_campaign, INQUIRY_LIMITS.utm),
    },
  };
}
