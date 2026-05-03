"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";

export async function createNote(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const groupId = String(formData.get("groupId") || "");
  const bandId = String(formData.get("bandId") || "");
  const content = String(formData.get("content") || "");
  const visibilityRaw = String(formData.get("visibility") || "private");
  const visibility = visibilityRaw === "group" ? "group" : "private";

  const { data: membership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { error: "Du bist nicht in dieser Gruppe." };
  }

  const { error } = await supabase.from("notes").insert({
    band_id: bandId,
    author_id: user.id,
    content,
    visibility
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/groups/${groupId}/notes`);
  return { success: true };
}

export async function updateNote(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const groupId = String(formData.get("groupId") || "").trim();
  const noteId = String(formData.get("noteId") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const visibilityRaw = String(formData.get("visibility") || "private");
  const visibility = visibilityRaw === "group" ? "group" : "private";

  if (!groupId || !noteId || !content) {
    return { error: "Notiz konnte nicht aktualisiert werden." };
  }

  const { error } = await supabase
    .from("notes")
    .update({ content, visibility })
    .eq("id", noteId)
    .eq("author_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/groups/${groupId}/notes`);
  return { success: true };
}

export async function deleteNote(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const groupId = String(formData.get("groupId") || "").trim();
  const noteId = String(formData.get("noteId") || "").trim();

  if (!groupId || !noteId) {
    return { error: "Notiz konnte nicht gelöscht werden." };
  }

  const { error } = await supabase.from("notes").delete().eq("id", noteId).eq("author_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/groups/${groupId}/notes`);
  return { success: true };
}

export async function batchUpdateOwnNoteVisibility(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const groupId = String(formData.get("groupId") || "").trim();
  const visibilityRaw = String(formData.get("visibility") || "private");
  const visibility = visibilityRaw === "group" ? "group" : "private";
  const noteIds = formData
    .getAll("noteIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!groupId || !noteIds.length) {
    return { error: "Keine Notizen ausgewählt." };
  }

  const { error } = await supabase
    .from("notes")
    .update({ visibility })
    .in("id", noteIds)
    .eq("author_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/groups/${groupId}/notes`);
  return { success: true };
}
