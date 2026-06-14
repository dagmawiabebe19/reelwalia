import fs from "fs/promises";
import path from "path";

export const LEGAL_LAST_UPDATED = "June 13, 2026";

export async function readLegalMarkdown(filename: string): Promise<string> {
  const filePath = path.join(process.cwd(), "content", filename);
  return fs.readFile(filePath, "utf8");
}
