import { COMMERCIAL_INQUIRY_NOTIFY_EMAIL } from "@/lib/commercials/constants";
import type { CommercialInquiryInput } from "@/lib/commercials/validation";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function row(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `<tr><td style="padding:6px 12px 6px 0;color:#a1a1aa;vertical-align:top;">${label}</td><td style="padding:6px 0;color:#fff;">${escapeHtml(value)}</td></tr>`;
}

/** Resend notification for a new commercial inquiry. Skips quietly when Resend is not configured. */
export async function sendCommercialInquiryNotification(
  inquiry: CommercialInquiryInput & { id: string; referenceTitle?: string | null }
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping commercial inquiry notification");
    return { sent: false, error: "Email not configured" };
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "ReelWalia <onboarding@resend.dev>";
  const subject = `New advertisement inquiry: ${inquiry.company || inquiry.name}`;
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://reelwalia.com"}/admin/commercials?tab=inquiries`;

  const html = `
    <div style="font-family:Inter,Helvetica,Arial,sans-serif;background:#0A0A0A;color:#fff;padding:24px;">
      <h1 style="font-size:20px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.04em;">New Advertisement Inquiry</h1>
      <p style="color:#a1a1aa;margin:0 0 24px;">Someone wants ReelWalia to make their advertisement.</p>
      <table style="border-collapse:collapse;font-size:14px;line-height:1.5;">
        ${row("Name", inquiry.name)}
        ${row("Email", inquiry.email)}
        ${row("Company", inquiry.company)}
        ${row("Phone", inquiry.phone)}
        ${row("Budget", inquiry.budget_range)}
        ${row("Timeline", inquiry.timeline)}
        ${row("Platforms", inquiry.platforms.join(", "))}
        ${row("Reference", inquiry.referenceTitle ?? inquiry.reference_commercial_id)}
        ${row("UTM source", inquiry.utm_source)}
        ${row("UTM medium", inquiry.utm_medium)}
        ${row("UTM campaign", inquiry.utm_campaign)}
      </table>
      <p style="margin:24px 0 8px;color:#a1a1aa;font-size:13px;">Message</p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;">${escapeHtml(inquiry.message).replace(/\n/g, "<br>")}</p>
      <a href="${adminUrl}" style="display:inline-block;background:#E53935;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:600;">Open in Admin</a>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [COMMERCIAL_INQUIRY_NOTIFY_EMAIL],
        reply_to: inquiry.email,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.error("[email] Resend error:", res.status, await res.text());
      return { sent: false, error: "Failed to send notification email" };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email] Resend request failed:", err);
    return { sent: false, error: "Failed to send notification email" };
  }
}
