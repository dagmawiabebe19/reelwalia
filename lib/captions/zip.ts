import JSZip from "jszip";

export interface ZipEntry {
  filename: string;
  content: string;
}

export async function extractVttFromZip(buffer: ArrayBuffer): Promise<ZipEntry[]> {
  const zip = await JSZip.loadAsync(buffer);
  const entries: ZipEntry[] = [];

  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    if (!path.toLowerCase().endsWith(".vtt")) continue;
    if (path.startsWith("__MACOSX/") || path.includes("/.")) continue;

    const content = await file.async("string");
    entries.push({ filename: path, content });
  }

  return entries;
}
