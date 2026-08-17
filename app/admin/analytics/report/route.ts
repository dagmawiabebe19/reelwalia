import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { buildSeriesAnalyticsPdf } from "@/lib/admin/analytics-pdf";
import { parseAnalyticsRange } from "@/lib/admin/analytics-range";
import { loadSeriesAnalytics } from "@/lib/admin/series-analytics";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const seriesId = url.searchParams.get("seriesId");
  if (!seriesId) {
    return NextResponse.json({ error: "seriesId required" }, { status: 400 });
  }

  const range = parseAnalyticsRange({
    preset: url.searchParams.get("preset"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });

  const data = await loadSeriesAnalytics(seriesId, range);
  if (!data) {
    return NextResponse.json({ error: "Series not found" }, { status: 404 });
  }

  const pdf = buildSeriesAnalyticsPdf(data);
  const slug = data.series.slug.replace(/[^a-z0-9-]+/gi, "-");
  const stamp = range.from.toISOString().slice(0, 10);

  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reelwalia-${slug}-report-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
