import {
  getCaptionLanguageLabel,
  isCaptionLanguageCode,
  type CaptionLanguageCode,
} from "@/lib/captions/languages";

export interface ParsedVttFile {
  languageCode: CaptionLanguageCode;
  languageLabel: string;
  filename: string;
  content: string;
}

const WEBVTT_HEADER = /^WEBVTT/i;

export function parseLanguageFromFilename(filename: string): CaptionLanguageCode | null {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const withoutExt = base.replace(/\.vtt$/i, "").toLowerCase();
  return isCaptionLanguageCode(withoutExt) ? withoutExt : null;
}

export function validateVttContent(content: string): { valid: true } | { valid: false; reason: string } {
  const trimmed = content.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    return { valid: false, reason: "File is empty" };
  }

  const firstLine = trimmed.split(/\r?\n/, 1)[0]?.trim() ?? "";
  if (!WEBVTT_HEADER.test(firstLine)) {
    return { valid: false, reason: "Missing WEBVTT header" };
  }

  const body = trimmed.slice(firstLine.length).trim();
  if (!body) {
    return { valid: false, reason: "No caption cues found" };
  }

  return { valid: true };
}

export function parseVttFile(
  filename: string,
  content: string
): { ok: true; file: ParsedVttFile } | { ok: false; reason: string } {
  const languageCode = parseLanguageFromFilename(filename);
  if (!languageCode) {
    return {
      ok: false,
      reason: `Unrecognized language code in filename: ${filename}`,
    };
  }

  const validation = validateVttContent(content);
  if (!validation.valid) {
    return { ok: false, reason: `${filename}: ${validation.reason}` };
  }

  return {
    ok: true,
    file: {
      languageCode,
      languageLabel: getCaptionLanguageLabel(languageCode),
      filename,
      content: content.replace(/^\uFEFF/, ""),
    },
  };
}

export function captionStoragePath(episodeId: string, languageCode: CaptionLanguageCode): string {
  return `${episodeId}/${languageCode}.vtt`;
}
