import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { seriesId?: string };
    const { seriesId } = body;

    if (!seriesId) {
      return NextResponse.json({ error: "seriesId required" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", user.id)
      .eq("series_id", seriesId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("watchlist")
        .delete()
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ added: false });
    }

    const { error } = await supabase.from("watchlist").insert({
      user_id: user.id,
      series_id: seriesId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ added: true });
  } catch (err) {
    console.error("watchlist toggle error:", err);
    return NextResponse.json({ error: "Failed to toggle watchlist" }, { status: 500 });
  }
}
