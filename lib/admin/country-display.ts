import { COUNTRY_UNKNOWN, normalizeCountryCode } from "@/lib/country-geo";

const REGIONAL_BASE = 0x1f1e6;

/** ISO 3166-1 alpha-2 → flag emoji (aggregate display only). */
export function countryFlag(code: string | null | undefined): string {
  const normalized = normalizeCountryCode(code);
  if (!normalized || normalized === COUNTRY_UNKNOWN) return "";
  return String.fromCodePoint(
    ...normalized.split("").map((char) => REGIONAL_BASE + char.charCodeAt(0) - 65)
  );
}

export function countryLabel(code: string | null | undefined): string {
  const normalized = normalizeCountryCode(code);
  if (!normalized || normalized === COUNTRY_UNKNOWN) return "Unknown";
  try {
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(normalized);
    return name ? `${normalized} — ${name}` : normalized;
  } catch {
    return normalized;
  }
}

export function countryDisplay(code: string | null | undefined): string {
  const normalized = normalizeCountryCode(code);
  if (!normalized || normalized === COUNTRY_UNKNOWN) return "Unknown";
  const flag = countryFlag(normalized);
  return flag ? `${flag} ${normalized}` : normalized;
}
