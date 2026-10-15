import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_USER_ID, isAdminUserId } from "@/lib/admin-id";

export { ADMIN_USER_ID, isAdminUserId };

export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=/admin/series");
  }

  if (!isAdminUserId(user.id)) {
    redirect("/not-authorized");
  }

  return { user, supabase };
}

export async function requireAdminApi() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in", status: 401 as const, user: null };
  }
  if (!isAdminUserId(user.id)) {
    return { error: "Not authorized", status: 403 as const, user: null };
  }

  return { error: null, status: 200 as const, user };
}
