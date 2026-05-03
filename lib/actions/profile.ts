"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";
import { normalizeManagedIdentifier } from "@/lib/auth/identity";

export async function upsertProfile(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const usernameRaw = String(formData.get("username") || formData.get("displayName") || "").trim();
  const username = normalizeManagedIdentifier(usernameRaw);
  const avatarUrl = String(formData.get("avatarUrl") || "").trim();

  if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
    return { error: "Profilbild-URL ist ungültig." };
  }

  if (!username) {
    return { error: "Benutzername ist erforderlich." };
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      display_name: username,
      avatar_url: avatarUrl || null
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { error: error.message };
  }

  await supabase.auth.updateUser({
    data: { username, display_name: username }
  });

  revalidatePath("/dashboard/profile");
  return { success: true };
}
