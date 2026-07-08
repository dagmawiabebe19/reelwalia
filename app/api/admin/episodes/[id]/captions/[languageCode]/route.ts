import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { isCaptionLanguageCode } from "@/lib/captions/languages";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; languageCode: string } }
) {
  const auth = await requireAdminApi();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const languageCode = params.languageCode.toLowerCase();
  if (!isCaptionLanguageCode(languageCode)) {
    return NextResponse.json({ error: "Invalid language code" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    const { data: caption } = await admin
      .from("episode_captions")
      .select("id, storage_path")
      .eq("episode_id", params.id)
      .eq("language_code", languageCode)
      .maybeSingle();

    if (!caption) {
      return NextResponse.json({ error: "Caption not found" }, { status: 404 });
    }

    const { error: storageError } = await admin.storage
      .from("captions")
      .remove([caption.storage_path]);

    if (storageError) {
      console.warn("caption storage delete failed:", storageError.message);
    }

    const { error: dbError } = await admin
      .from("episode_captions")
      .delete()
      .eq("id", caption.id);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("caption delete error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
