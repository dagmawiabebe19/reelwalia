import type { AcquisitionSubmissionStatus } from "@/lib/submissions/constants";
import { REVENUE_SHARE_PRESETS } from "@/lib/submissions/constants";
import {
  normalizeDealTermsFields,
  parseNullableNumber,
} from "@/lib/submissions/normalize-submission";

export type DealTermsFields = {
  distribution_type: string | null;
  revenue_share: string | null;
  license_fee: number | null;
  contract_sent: boolean;
  contract_signed: boolean;
  content_delivered: boolean;
  launch_date: string | null;
};

export function isDealTrackingStatus(status: string): boolean {
  return status === "negotiating" || status === "accepted";
}

export function isReadyToLaunch(deal: Pick<
  DealTermsFields,
  "contract_signed" | "content_delivered" | "launch_date"
>): boolean {
  return deal.contract_signed && deal.content_delivered && Boolean(deal.launch_date);
}

export function parseRevenueShareFromDb(value: string | null | undefined): {
  preset: string;
  custom: string;
} {
  if (!value) return { preset: "", custom: "" };
  if ((REVENUE_SHARE_PRESETS as readonly string[]).includes(value)) {
    return { preset: value, custom: "" };
  }
  return { preset: "custom", custom: value };
}

export function resolveRevenueShareForSave(
  preset: string,
  custom: string
): string | null {
  const trimmedPreset = preset.trim();
  if (!trimmedPreset) return null;
  if (trimmedPreset === "custom") {
    const trimmedCustom = custom.trim();
    return trimmedCustom || null;
  }
  return trimmedPreset;
}

export function formatLicenseFee(value: number | string | null | undefined): string | null {
  const parsed = parseNullableNumber(value);
  if (parsed == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(parsed);
}

export function parseLicenseFeeInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[$,]/g, "");
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100) / 100;
}

export function formatLaunchDateForInput(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export type DealTermsInput = {
  distributionType: string;
  revenueSharePreset: string;
  revenueShareCustom: string;
  licenseFee: string;
  contractSent: boolean;
  contractSigned: boolean;
  contentDelivered: boolean;
  launchDate: string;
};

export function dealTermsFromSubmission(
  submission: DealTermsFields & { submission_status?: AcquisitionSubmissionStatus }
): DealTermsInput {
  const normalized = normalizeDealTermsFields(submission);
  const { preset, custom } = parseRevenueShareFromDb(normalized.revenue_share);

  return {
    distributionType: normalized.distribution_type ?? "",
    revenueSharePreset: preset,
    revenueShareCustom: custom,
    licenseFee:
      normalized.license_fee != null ? String(normalized.license_fee) : "",
    contractSent: normalized.contract_sent,
    contractSigned: normalized.contract_signed,
    contentDelivered: normalized.content_delivered,
    launchDate: formatLaunchDateForInput(normalized.launch_date),
  };
}

export function validateDealTermsInput(input: DealTermsInput): {
  ok: true;
  data: DealTermsFields;
} | {
  ok: false;
  error: string;
} {
  const distributionType = input.distributionType.trim() || null;
  const revenueShare = resolveRevenueShareForSave(
    input.revenueSharePreset,
    input.revenueShareCustom
  );
  const licenseFee = parseLicenseFeeInput(input.licenseFee);

  if (input.licenseFee.trim() && licenseFee === null) {
    return { ok: false, error: "License fee must be a valid dollar amount." };
  }

  if (
    distributionType &&
    !["non_exclusive", "exclusive", "reelwalia_original"].includes(distributionType)
  ) {
    return { ok: false, error: "Invalid distribution type." };
  }

  if (input.revenueSharePreset.trim() === "custom" && !input.revenueShareCustom.trim()) {
    return { ok: false, error: "Enter a custom revenue share or choose a preset." };
  }

  return {
    ok: true,
    data: {
      distribution_type: distributionType,
      revenue_share: revenueShare,
      license_fee: licenseFee,
      contract_sent: input.contractSent,
      contract_signed: input.contractSigned,
      content_delivered: input.contentDelivered,
      launch_date: input.launchDate.trim() || null,
    },
  };
}
