"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";

export async function sendGroupDirectMessage(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const groupId = String(formData.get("groupId") || "").trim();
  const recipientId = String(formData.get("recipientId") || "").trim();
  const content = String(formData.get("content") || "").trim();

  if (!groupId || !recipientId || !content) {
    return { error: "Empfaenger und Nachricht sind erforderlich." };
  }

  const { error } = await supabase.from("group_direct_messages").insert({
    group_id: groupId,
    sender_id: user.id,
    recipient_id: recipientId,
    content
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/groups/${groupId}`);
  return { success: true };
}

export async function deleteDirectMessage(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const groupId = String(formData.get("groupId") || "").trim();
  const messageId = String(formData.get("messageId") || "").trim();

  if (!groupId || !messageId) {
    return { error: "Nachricht konnte nicht geloescht werden." };
  }

  const { error } = await supabase
    .from("group_direct_messages")
    .delete()
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/groups/${groupId}`);
  return { success: true };
}
