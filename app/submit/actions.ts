"use server";

import { sendSubmissionNotification } from "@/lib/email/submission-notification";
import { createClient } from "@/lib/supabase/server";
import {
  validateCreatorSubmission,
  type CreatorSubmissionInput,
} from "@/lib/submissions/validation";

export async function submitCreatorProject(input: CreatorSubmissionInput) {
  const validated = validateCreatorSubmission(input);
  if (!validated.ok) {
    return { ok: false as const, error: validated.error };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("creator_submissions")
    .insert(validated.data)
    .select("id")
    .single();

  if (error) {
    console.error("[submit] database error:", error.message);
    return {
      ok: false as const,
      error: "We couldn't save your submission. Please try again.",
    };
  }

  await sendSubmissionNotification({ ...validated.data, id: data.id });

  return { ok: true as const };
}
