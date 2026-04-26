"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";

export async function createGroup(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const name = String(formData.get("name") || "").trim();

  if (!name) {
    return { error: "Gruppenname ist erforderlich." };
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({ name, created_by: user.id })
    .select("id")
    .single();

  if (groupError || !group) {
    return { error: groupError?.message ?? "Gruppe konnte nicht erstellt werden." };
  }

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id, role: "admin" });

  if (memberError) {
    return { error: memberError.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function joinGroup(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const groupId = String(formData.get("groupId") || "").trim();

  if (!groupId) {
    return { error: "Group ID fehlt." };
  }

  const { error } = await supabase
    .from("group_members")
    .upsert({ group_id: groupId, user_id: user.id, role: "member" }, { onConflict: "group_id,user_id" });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
