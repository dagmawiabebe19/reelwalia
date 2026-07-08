import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { getEpisodeCaptionsForAdmin } from "@/lib/captions/server";
import { captionStoragePath, parseVttFile } from "@/lib/captions/vtt";
import { extractVttFromZip } from "@/lib/captions/zip";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EpisodeCaption } from "@/lib/types/database";

interface UploadResult {
  attached: EpisodeCaption[];
  warnings: string[];
}

async function collectVttEntries(formData: FormData): Promise<
  { entries: { filename: string; content: string }[]; warnings: string[] }
> {
  const warnings: string[] = [];
  const entries: { filename: string; content: string }[] = [];
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (!files.length) {
    return { entries, warnings: ["No files provided"] };
  }

  for (const file of files) {
    const lower = file.name.toLowerCase();

    if (lower.endsWith(".zip")) {
      const zipEntries = await extractVttFromZip(await file.arrayBuffer());
      if (!zipEntries.length) {
        warnings.push(`${file.name}: no .vtt files found in ZIP`);
        continue;
      }
      entries.push(...zipEntries);
      continue;
    }

    if (lower.endsWith(".vtt")) {
      entries.push({
        filename: file.name,
        content: await file.text(),
      });
      continue;
    }

    warnings.push(`${file.name}: skipped (not a .vtt or .zip file)`);
  }

  return { entries, warnings };
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminApi();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const captions = await getEpisodeCaptionsForAdmin(params.id);
  return NextResponse.json({ captions });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminApi();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const admin = createAdminClient();
    const episodeId = params.id;

    const { data: episode } = await admin
      .from("episodes")
      .select("id")
      .eq("id", episodeId)
      .maybeSingle();

    if (!episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const { entries, warnings: collectWarnings } = await collectVttEntries(formData);

    if (!entries.length) {
      return NextResponse.json(
        { error: collectWarnings[0] ?? "No caption files to process", warnings: collectWarnings },
        { status: 400 }
      );
    }

    const warnings = [...collectWarnings];
    const attached: EpisodeCaption[] = [];
    const seenLanguages = new Set<string>();

    for (const entry of entries) {
      const parsed = parseVttFile(entry.filename, entry.content);
      if (!parsed.ok) {
        warnings.push(parsed.reason);
        continue;
      }

      const { languageCode, languageLabel, content } = parsed.file;
      if (seenLanguages.has(languageCode)) {
        warnings.push(`${entry.filename}: duplicate language ${languageCode}; using last file`);
      }
      seenLanguages.add(languageCode);

      const storagePath = captionStoragePath(episodeId, languageCode);
      const buffer = Buffer.from(content, "utf-8");

      const { error: uploadError } = await admin.storage
        .from("captions")
        .upload(storagePath, buffer, {
          contentType: "text/vtt",
          upsert: true,
        });

      if (uploadError) {
        warnings.push(`${entry.filename}: upload failed — ${uploadError.message}`);
        continue;
      }

      const { data: row, error: dbError } = await admin
        .from("episode_captions")
        .upsert(
          {
            episode_id: episodeId,
            language_code: languageCode,
            language_label: languageLabel,
            storage_path: storagePath,
          },
          { onConflict: "episode_id,language_code" }
        )
        .select()
        .single();

      if (dbError || !row) {
        warnings.push(`${entry.filename}: database save failed — ${dbError?.message ?? "unknown"}`);
        continue;
      }

      const existingIdx = attached.findIndex((c) => c.language_code === languageCode);
      if (existingIdx >= 0) {
        attached[existingIdx] = row;
      } else {
        attached.push(row);
      }
    }

    if (!attached.length) {
      return NextResponse.json(
        { error: "No valid caption files were attached", warnings },
        { status: 400 }
      );
    }

    return NextResponse.json({ attached, warnings } satisfies UploadResult);
  } catch (err) {
    console.error("caption upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
