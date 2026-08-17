import {
  formatCount,
  formatPercent,
  formatUsdCents,
  LICENSOR_SHARE,
} from "@/lib/admin/analytics-range";
import type { SeriesAnalytics } from "@/lib/admin/series-analytics";

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/**
 * Minimal single-document PDF (Helvetica) — no extra dependencies.
 */
export function buildSeriesAnalyticsPdf(data: SeriesAnalytics): Uint8Array {
  const lines: { text: string; size: number; color?: [number, number, number] }[] = [];
  const push = (text: string, size = 11, color?: [number, number, number]) => {
    lines.push({ text, size, color });
  };

  push("REELWALIA", 18, [0.88, 0.24, 0.18]);
  push("Licensor performance report — single series only", 10, [0.45, 0.45, 0.45]);
  push("");
  push(data.series.title, 16);
  push(`Reporting period: ${data.range.label} (UTC)`, 11);
  push(`Generated: ${new Date().toISOString().slice(0, 10)}`, 10, [0.45, 0.45, 0.45]);
  push("");
  push("This report contains data for the titled series only. No other shows or platform totals are included.", 9, [0.4, 0.4, 0.4]);
  push("");

  push("TOP LINE", 13, [0.88, 0.24, 0.18]);
  push(`Total views / plays: ${formatCount(data.views.value)}`);
  push(`  Source: ${data.views.source} — ${data.views.note}`, 9, [0.5, 0.5, 0.5]);
  push(`Unique viewers (signed-in): ${formatCount(data.uniqueViewers.value)}`);
  push(`  ${data.uniqueViewers.note}`, 9, [0.5, 0.5, 0.5]);
  push(
    `Full-series completion: ${formatPercent(data.fullSeriesCompletion.value)} (${formatCount(data.fullSeriesCompletion.completers)} viewers finished every episode)`
  );
  push(`Paywall conversion: ${formatPercent(data.paywallConversion.rate)}`);
  push(
    `  Reached paywall: ${formatCount(data.paywallConversion.reached)}   Purchased: ${formatCount(data.paywallConversion.purchased)}`,
    10
  );
  push(`  ${data.paywallConversion.note}`, 9, [0.5, 0.5, 0.5]);
  push("");

  push("PER-EPISODE DROP-OFF", 13, [0.88, 0.24, 0.18]);
  push("Distinct viewers per episode. Finished merges episode_events + watch_history.", 9, [0.5, 0.5, 0.5]);
  if (data.historyCompletionsRecovered != null && data.historyCompletionsRecovered > 0) {
    push(
      `Recovered ${data.historyCompletionsRecovered} completion(s) from watch_history not present in episode_events.`,
      9,
      [0.5, 0.5, 0.5]
    );
  }
  push("Episode     Started     Finished     Completion", 10);
  for (const ep of data.dropOff) {
    const row = `Ep ${String(ep.episodeNumber).padEnd(4)}  ${formatCount(ep.started).padEnd(10)}  ${formatCount(ep.finished).padEnd(11)}  ${formatPercent(ep.completionRate)}`;
    push(row, 10);
  }
  push("");

  if (data.topCountries.tracked) {
    push("TOP COUNTRIES (ISO code — aggregate only)", 13, [0.88, 0.24, 0.18]);
    push("By views (play starts):", 11);
    if (data.topCountries.byViews.length === 0) {
      push("  No view events with country in this range.", 10, [0.5, 0.5, 0.5]);
    } else {
      for (const row of data.topCountries.byViews) {
        push(`  ${row.country}: ${row.count.toLocaleString()}`, 10);
      }
    }
    push("By subscribers (purchases):", 11);
    if (data.topCountries.byPurchases.length === 0) {
      push("  No purchase events with country in this range.", 10, [0.5, 0.5, 0.5]);
    } else {
      for (const row of data.topCountries.byPurchases) {
        push(`  ${row.country}: ${row.count.toLocaleString()}`, 10);
      }
    }
    push("");
  }

  push("PAYWALL FUNNEL", 13, [0.88, 0.24, 0.18]);
  push(`Reached paywall: ${formatCount(data.paywallConversion.reached)}`);
  push(`Purchased / subscribed: ${formatCount(data.paywallConversion.purchased)}`);
  push(`Conversion rate: ${formatPercent(data.paywallConversion.rate)}`);
  push("");

  const r = data.revenue;
  push("REVENUE (Net Revenue definition)", 13, [0.88, 0.24, 0.18]);
  push("Gross receipts attributable to this series", 11);
  push(`  Direct (checkout on this title): ${formatUsdCents(r.directCents)}`, 10);
  push(`  Pro-rata (platform subs by watch-time): ${formatUsdCents(r.prorataCents)}`, 10);
  push(`  Gross: ${formatUsdCents(r.grossCents)}`);
  push("Defined deductions", 11);
  push(`  Payment processing fees: ${formatUsdCents(r.processingFeeCents)}`, 10);
  push(`  Refunds: ${formatUsdCents(r.refundsCents)}`, 10);
  push(`  Taxes: ${formatUsdCents(r.taxCents)}`, 10);
  push(`  App-store commissions: ${formatUsdCents(r.appStoreCents)} (web checkout = $0.00)`, 10);
  push(
    `  Delivery / bandwidth: ${r.deliveryTracked ? formatUsdCents(r.deliveryCents) : "Not yet tracked"}`,
    10
  );
  push(`Net Revenue: ${formatUsdCents(r.netCents)}`);
  push(`Licensor share (${Math.round(LICENSOR_SHARE * 100)}% of Net): ${formatUsdCents(r.licensorShareCents)}`, 12);
  push("");
  for (const wrapped of wrap(r.note, 92)) {
    push(wrapped, 8, [0.45, 0.45, 0.45]);
  }
  if (!data.tablesReady) {
    push("");
    push("Migration 027 (episode_events / billing_events) is not applied yet. Apply it in the Platform SQL editor to start capturing event-level and Stripe cash data.", 9, [0.7, 0.4, 0.2]);
  }

  return encodePdf(lines);
}

function encodePdf(
  lines: { text: string; size: number; color?: [number, number, number] }[]
): Uint8Array {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 48;
  const pages: string[][] = [];
  let y = pageHeight - margin;
  let current: string[] = [];

  const startPage = () => {
    current = [];
    y = pageHeight - margin;
  };

  startPage();

  for (const line of lines) {
    const leading = line.size + 4;
    if (y - leading < margin) {
      pages.push(current);
      startPage();
    }
    const color = line.color ?? [0.08, 0.08, 0.08];
    current.push(
      `BT /F1 ${line.size} Tf ${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)} rg ${margin} ${y.toFixed(1)} Td (${pdfEscape(line.text)}) Tj ET`
    );
    y -= leading;
  }
  pages.push(current);

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  const pageObjectNumbers: number[] = [];
  const contentObjectNumbers: number[] = [];
  let nextNum = 4;
  for (let i = 0; i < pages.length; i++) {
    pageObjectNumbers.push(nextNum);
    contentObjectNumbers.push(nextNum + 1);
    nextNum += 2;
  }

  const kids = pageObjectNumbers.map((n) => `${n} 0 R`).join(" ");
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const body: { num: number; content: string }[] = [
    { num: 1, content: objects[0] },
    { num: 2, content: objects[1] },
    { num: 3, content: objects[2] },
  ];

  pages.forEach((ops, index) => {
    const stream = ops.join("\n");
    const pageNum = pageObjectNumbers[index];
    const contentNum = contentObjectNumbers[index];
    body.push({
      num: pageNum,
      content: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNum} 0 R >>`,
    });
    body.push({
      num: contentNum,
      content: `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    });
  });

  body.sort((a, b) => a.num - b.num);

  let offset = 0;
  const chunks: string[] = ["%PDF-1.4\n"];
  offset = chunks[0].length;
  const xref: number[] = [0];

  for (const obj of body) {
    xref[obj.num] = offset;
    const chunk = `${obj.num} 0 obj\n${obj.content}\nendobj\n`;
    chunks.push(chunk);
    offset += chunk.length;
  }

  const xrefStart = offset;
  const maxNum = body[body.length - 1].num;
  let xrefTable = `xref\n0 ${maxNum + 1}\n`;
  xrefTable += "0000000000 65535 f \n";
  for (let i = 1; i <= maxNum; i++) {
    xrefTable += `${String(xref[i] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  chunks.push(xrefTable);
  chunks.push(
    `trailer\n<< /Size ${maxNum + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  );

  return new TextEncoder().encode(chunks.join(""));
}
