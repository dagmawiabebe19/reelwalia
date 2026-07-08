export const CAPTION_LANGUAGE_CODES = [
  "en",
  "es",
  "fr",
  "pt",
  "am",
  "de",
  "nl",
  "ja",
  "ko",
  "zh",
  "ru",
  "ar",
  "sw",
] as const;

export type CaptionLanguageCode = (typeof CAPTION_LANGUAGE_CODES)[number];

export const CAPTION_LANGUAGE_LABELS: Record<CaptionLanguageCode, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  pt: "Português",
  am: "አማርኛ",
  de: "Deutsch",
  nl: "Nederlands",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
  ru: "Русский",
  ar: "العربية",
  sw: "Kiswahili",
};

export function isCaptionLanguageCode(code: string): code is CaptionLanguageCode {
  return (CAPTION_LANGUAGE_CODES as readonly string[]).includes(code);
}

export function getCaptionLanguageLabel(code: CaptionLanguageCode): string {
  return CAPTION_LANGUAGE_LABELS[code];
}
