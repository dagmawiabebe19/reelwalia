"use server";

import { sendSubmissionNotification } from "@/lib/email/submission-notification";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import {
  validateCreatorSubmission,
  type CreatorSubmissionInput,
} from "@/lib/submissions/validation";

export async function submitCreatorProject(input: CreatorSubmissionInput) {
  const validated = validateCreatorSubmission(input);
  if (!validated.ok) {
    return { ok: false as const, error: validated.error };
  }

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip")?.trim() ||
    "unknown";
  const email = validated.data.email.trim().toLowerCase();

  const ipLimit = checkRateLimit(`submit:ip:${ip}`, 5, 60 * 60_000);
  if (!ipLimit.ok) {
    return {
      ok: false as const,
      error: "Too many submissions from this network. Try again later.",
    };
  }

  const emailLimit = checkRateLimit(`submit:email:${email}`, 2, 24 * 60 * 60_000);
  if (!emailLimit.ok) {
    return {
      ok: false as const,
      error: "A submission was already sent from this email recently.",
    };
  }

  const submissionId = crypto.randomUUID();
  const supabase = createClient();
  const { error } = await supabase
    .from("creator_submissions")
    .insert({ ...validated.data, id: submissionId });

  if (error) {
    console.error("[submit] database error:", error.message);
    return {
      ok: false as const,
      error: "We couldn't save your submission. Please try again.",
    };
  }

  await sendSubmissionNotification({ ...validated.data, id: submissionId });

  return { ok: true as const };
}
