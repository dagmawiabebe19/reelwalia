import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { createBunnyTusUploadCredentials } from "@/lib/bunny-tus";
import { createVideo } from "@/lib/bunny";

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as { title?: string };
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const { videoId } = await createVideo(body.title.trim());
    const credentials = createBunnyTusUploadCredentials(videoId);

    return NextResponse.json(credentials);
  } catch (err) {
    console.error("create-upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload init failed" },
      { status: 500 }
    );
  }
}
