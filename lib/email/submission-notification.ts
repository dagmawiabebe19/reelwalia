import type { CreatorSubmissionRecord } from "@/lib/submissions/validation";
import { SUBMISSION_NOTIFY_EMAIL } from "@/lib/submissions/constants";

function linkLine(label: string, url: string | null): string {
  if (!url) return "";
  return `<tr><td style="padding:6px 12px 6px 0;color:#a1a1aa;vertical-align:top;">${label}</td><td style="padding:6px 0;"><a href="${url}" style="color:#E03C2F;">${url}</a></td></tr>`;
}

function textRow(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `<tr><td style="padding:6px 12px 6px 0;color:#a1a1aa;vertical-align:top;">${label}</td><td style="padding:6px 0;color:#fff;">${value}</td></tr>`;
}

function boolLabel(value: boolean): string {
  return value ? "Yes" : "No";
}

function productionLabel(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function sendSubmissionNotification(
  submission: CreatorSubmissionRecord & { id: string }
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping submission notification");
    return { sent: false, error: "Email not configured" };
  }

  const from =
    process.env.RESEND_FROM_EMAIL ?? "ReelWalia Submissions <onboarding@resend.dev>";
  const subject = `New creator submission: ${submission.project_title}`;
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://reelwalia.com"}/admin/submissions/${submission.id}`;

  const html = `
    <div style="font-family:Inter,Helvetica,Arial,sans-serif;background:#000;color:#fff;padding:24px;">
      <h1 style="font-size:20px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.04em;">New Creator Submission</h1>
      <p style="color:#a1a1aa;margin:0 0 24px;">A new project was submitted for ReelWalia review.</p>
      <table style="border-collapse:collapse;font-size:14px;line-height:1.5;">
        ${textRow("Creator", submission.creator_name)}
        ${textRow("Email", submission.email)}
        ${textRow("Phone", submission.phone)}
        ${textRow("Company", submission.company)}
        ${textRow("Country", submission.country)}
        ${textRow("Project", submission.project_title)}
        ${textRow("Genre", submission.genre)}
        ${textRow("Production Status", productionLabel(submission.production_status))}
        ${textRow("Episodes", String(submission.episode_count))}
        ${textRow("Avg. Length", submission.average_episode_length)}
        ${textRow(
          "Runtime",
          submission.runtime_minutes != null
            ? `${submission.runtime_minutes} minutes`
            : null
        )}
        ${textRow("Logline", submission.logline)}
        ${textRow("Owns Rights", boolLabel(submission.owns_distribution_rights))}
        ${textRow("Released Elsewhere", boolLabel(submission.released_elsewhere))}
        ${textRow("Released Where", submission.released_elsewhere_where)}
        ${linkLine("Trailer", submission.trailer_link)}
        ${linkLine("Screener", submission.screener_link)}
        ${linkLine("YouTube", submission.youtube_link)}
        ${linkLine("Vimeo", submission.vimeo_link)}
        ${linkLine("Google Drive", submission.google_drive_link)}
        ${linkLine("Dropbox", submission.dropbox_link)}
        ${linkLine("Poster", submission.poster_link)}
        ${linkLine("Hero Banner", submission.hero_banner_link)}
      </table>
      <p style="margin:24px 0 8px;color:#a1a1aa;font-size:13px;">Description</p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;">${submission.description.replace(/\n/g, "<br>")}</p>
      ${
        submission.additional_notes
          ? `<p style="margin:0 0 8px;color:#a1a1aa;font-size:13px;">Additional Notes</p><p style="margin:0 0 24px;font-size:14px;line-height:1.6;">${submission.additional_notes.replace(/\n/g, "<br>")}</p>`
          : ""
      }
      <a href="${adminUrl}" style="display:inline-block;background:#E03C2F;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:600;">Review in Admin</a>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [SUBMISSION_NOTIFY_EMAIL],
        reply_to: submission.email,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend error:", res.status, body);
      return { sent: false, error: "Failed to send notification email" };
    }

    return { sent: true };
  } catch (err) {
    console.error("[email] Resend request failed:", err);
    return { sent: false, error: "Failed to send notification email" };
  }
}
