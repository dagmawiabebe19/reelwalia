"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUBMISSION_STATUSES, type SubmissionStatus } from "@/lib/submissions/constants";

export async function updateSubmissionStatus(id: string, status: SubmissionStatus) {
  await requireAdmin();

  if (!SUBMISSION_STATUSES.some((s) => s.value === status)) {
    throw new Error("Invalid status");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("creator_submissions")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/submissions");
  revalidatePath(`/admin/submissions/${id}`);
}
